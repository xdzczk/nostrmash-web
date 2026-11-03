import { cache } from "react";

import type { NoteContentResolution } from "@/components/explorer/note-content";
import { applyEngagementStats } from "@/components/explorer/utils";
import { isRecord } from "@/lib/api/normalize/helpers";
import {
  getEventAncestors,
  getEvent,
  getEventComments,
  getEventCounts,
  getEventReplies,
  getEventSeenOn,
  getNoteSummary,
  getRelatedNotes,
  getThreadActivity,
  getThreadSummary,
  getThread,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { fetchProfilesByPubkey, listHydratablePubkeys } from "@/lib/api/profile-hydration";
import { summarizeLoadErrors, toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { resolveContentReferences } from "@/lib/notes/resolve-content-refs";
import type { ThreadActivityStats } from "@/lib/notes/thread-activity";
import { isRepostEvent } from "@/lib/notes/repost";
import { resolveReplyParent, resolveReplyRoot } from "@/lib/notes/thread-tree";
import { readSearchParam, toUrlSearchParams } from "@/lib/search-params/pagination";
import type { EventRecord, Profile } from "@/lib/types/api";

export const getNoteSummaryCached = cache(async (eventId: string) =>
  getNoteSummary(eventId, "shortTtl")
);

function hasCanonicalPayloadFields(note: EventRecord | undefined, eventId: string): boolean {
  if (!note) return false;
  if (typeof note.id !== "string" || note.id.length === 0) return false;
  if (note.id !== eventId) return false;
  if (typeof note.pubkey !== "string" || note.pubkey.length === 0) return false;
  if (typeof note.content !== "string") return false;
  if (typeof note.created_at !== "number" || !Number.isFinite(note.created_at)) return false;
  return typeof note.kind === "number" && Number.isFinite(note.kind);
}

function readContextFlags(resolvedSearchParams: Record<string, string | string[] | undefined>) {
  const repliesCursor = readSearchParam(resolvedSearchParams, "replies_cursor");
  const activityCursor = readSearchParam(resolvedSearchParams, "activity_cursor");
  const relatedCursor = readSearchParam(resolvedSearchParams, "related_cursor");
  const viewMode = readSearchParam(resolvedSearchParams, "view");
  const includeExtendedContext = viewMode === "full";
  return {
    repliesCursor,
    activityCursor,
    relatedCursor,
    includeExtendedContext,
    includeThreadActivity: includeExtendedContext || typeof activityCursor === "string",
    includeRelatedNotes: includeExtendedContext || typeof relatedCursor === "string",
    currentSearchParams: toUrlSearchParams(resolvedSearchParams),
  };
}

/** Fast path: summary + optional enrichment + focal author/content refs only. */
export async function loadNoteFocalData(eventId: string) {
  const errors: string[] = [];
  let noteSummary: Awaited<ReturnType<typeof getNoteSummary>> | null = null;
  let eventPayload: Awaited<ReturnType<typeof getEvent>> | null = null;
  let eventSeenOnPayload: Awaited<ReturnType<typeof getEventSeenOn>> | null = null;
  let eventCountsPayload: Awaited<ReturnType<typeof getEventCounts>> | null = null;

  try {
    noteSummary = await getNoteSummaryCached(eventId);
  } catch (error) {
    errors.push(toUserFacingErrorMessage(error, "Failed to load note summary."));
  }

  const focalFromPrimary = noteSummary?.note;
  const shouldFetchCanonicalEvent = !hasCanonicalPayloadFields(focalFromPrimary, eventId);
  const shouldFetchCounts =
    !isRecord(noteSummary?.counts) || Object.keys(noteSummary.counts).length === 0;
  const summaryProvenance = isRecord(noteSummary?.provenance) ? noteSummary.provenance : undefined;
  const summaryRelayHints =
    (isRecord(noteSummary) && Array.isArray((noteSummary as Record<string, unknown>).seen_on)) ||
    (isRecord(summaryProvenance) && Array.isArray(summaryProvenance.relays));
  const shouldFetchSeenOn = !summaryRelayHints;

  const [eventResult, seenOnResult, countsResult] = await Promise.allSettled([
    shouldFetchCanonicalEvent ? getEvent(eventId, "shortTtl") : Promise.resolve(null),
    shouldFetchSeenOn ? getEventSeenOn(eventId, "shortTtl") : Promise.resolve(null),
    shouldFetchCounts ? getEventCounts(eventId, "shortTtl") : Promise.resolve(null),
  ]);

  if (eventResult.status === "fulfilled") eventPayload = eventResult.value;
  else if (shouldFetchCanonicalEvent) {
    errors.push(toUserFacingErrorMessage(eventResult.reason, ""));
  }
  if (seenOnResult.status === "fulfilled") eventSeenOnPayload = seenOnResult.value;
  else if (shouldFetchSeenOn) {
    errors.push(toUserFacingErrorMessage(seenOnResult.reason, ""));
  }
  if (countsResult.status === "fulfilled") eventCountsPayload = countsResult.value;
  else if (shouldFetchCounts) {
    errors.push(toUserFacingErrorMessage(countsResult.reason, ""));
  }

  const authorProfileFromSummary =
    isRecord(noteSummary?.author) && isRecord(noteSummary.author.profile)
      ? (noteSummary.author.profile as Profile)
      : undefined;

  const focal = noteSummary?.note ?? eventPayload?.event;
  let authorsByPubkey: Record<string, Profile> = {};
  try {
    authorsByPubkey = await fetchProfilesByPubkey(
      listHydratablePubkeys(
        [focal?.pubkey, authorProfileFromSummary?.pubkey].filter(
          (value): value is string => typeof value === "string" && value.length > 0
        )
      ),
      "shortTtl"
    );
  } catch {
    authorsByPubkey = {};
  }
  if (authorProfileFromSummary?.pubkey) {
    authorsByPubkey[authorProfileFromSummary.pubkey.toLowerCase()] = authorProfileFromSummary;
  }

  const contentResolution = await resolveContentReferences(focal ? [focal] : []).catch(() => ({
    profilesByPubkey: {},
    eventsById: {},
  }));
  contentResolution.profilesByPubkey = {
    ...contentResolution.profilesByPubkey,
    ...authorsByPubkey,
  };

  // Prefer the index's thread context; fall back to the event's own NIP-10
  // tags so replies are still recognised when the summary omits it.
  const threadContextFromSummary = isRecord(noteSummary?.thread) ? noteSummary.thread : {};
  // Kind 6 and 16 `e` tags point at the reposted event, not a reply parent.
  const repost = focal ? isRepostEvent(focal) : false;
  const rootEventId = repost
    ? undefined
    : typeof threadContextFromSummary.root_event_id === "string"
      ? threadContextFromSummary.root_event_id
      : focal
        ? resolveReplyRoot(focal)
        : undefined;
  const parentEventId = repost
    ? undefined
    : typeof threadContextFromSummary.parent_event_id === "string"
      ? threadContextFromSummary.parent_event_id
      : focal
        ? resolveReplyParent(focal)
        : undefined;

  const compactErrors = errors.filter((value) => value.length > 0);
  const errorMessage =
    !noteSummary && !eventPayload && compactErrors.length > 0
      ? (summarizeLoadErrors(compactErrors) ?? "")
      : "";

  const semantics = extractNativeApiSemantics(
    noteSummary,
    eventSeenOnPayload,
    eventCountsPayload,
    eventPayload
  );
  const resolvedAuthor =
    (typeof focal?.pubkey === "string" ? authorsByPubkey[focal.pubkey.toLowerCase()] : undefined) ??
    authorProfileFromSummary;

  return {
    authorsByPubkey,
    contentResolution,
    errorMessage,
    eventCountsPayload,
    eventPayload,
    eventSeenOnPayload,
    focal,
    noteSummary,
    parentEventId,
    resolvedAuthor,
    rootEventId,
    semantics,
    summaryProvenance,
  };
}

export async function loadNoteThreadData(
  eventId: string,
  resolvedSearchParams: Record<string, string | string[] | undefined>
) {
  const { repliesCursor } = readContextFlags(resolvedSearchParams);
  const errors: string[] = [];
  let threadPayload: Awaited<ReturnType<typeof getThread>> | null = null;
  let ancestorsPayload: Awaited<ReturnType<typeof getEventAncestors>> | null = null;
  let repliesPayload: Awaited<ReturnType<typeof getEventReplies>> | null = null;

  const [threadResult, ancestorsResult, repliesResult] = await Promise.allSettled([
    getThread(eventId, "shortTtl"),
    getEventAncestors(eventId, "shortTtl"),
    getEventReplies(eventId, "shortTtl", { cursor: repliesCursor }),
  ]);

  if (threadResult.status === "fulfilled") threadPayload = threadResult.value;
  else errors.push(toUserFacingErrorMessage(threadResult.reason, "Failed to load note thread."));
  if (ancestorsResult.status === "fulfilled") ancestorsPayload = ancestorsResult.value;
  else errors.push(toUserFacingErrorMessage(ancestorsResult.reason, "Failed to load ancestors."));
  if (repliesResult.status === "fulfilled") repliesPayload = repliesResult.value;
  else errors.push(toUserFacingErrorMessage(repliesResult.reason, "Failed to load replies."));

  const ancestors = ancestorsPayload?.ancestors ?? threadPayload?.ancestors ?? [];
  const replies = repliesPayload?.replies ?? threadPayload?.replies ?? [];
  const missingAncestorIds =
    ancestorsPayload?.missing_ancestor_ids ?? threadPayload?.missing_ancestor_ids ?? [];
  const repliesNextCursor = repliesPayload?.next_cursor ?? threadPayload?.next_cursor;
  const rootEventId =
    repliesPayload?.root_event_id ??
    threadPayload?.root?.id ??
    ancestorsPayload?.ancestors?.[0]?.id;

  let authorsByPubkey: Record<string, Profile> = {};
  try {
    authorsByPubkey = await fetchProfilesByPubkey(
      listHydratablePubkeys(
        [...ancestors, ...replies, threadPayload?.root]
          .flatMap((note) => (note?.pubkey ? [note.pubkey] : []))
          .filter(Boolean)
      ),
      "shortTtl"
    );
  } catch {
    authorsByPubkey = {};
  }

  const contentResolution = await resolveContentReferences(
    [...ancestors, ...replies, threadPayload?.root].filter((note): note is EventRecord =>
      Boolean(note)
    )
  ).catch(() => ({ profilesByPubkey: {}, eventsById: {} }));
  contentResolution.profilesByPubkey = {
    ...contentResolution.profilesByPubkey,
    ...authorsByPubkey,
  };

  return {
    ancestors,
    ancestorsPayload,
    authorsByPubkey,
    contentResolution,
    errorMessage: errors.filter(Boolean).join(" | "),
    missingAncestorIds,
    replies,
    repliesNextCursor,
    repliesPayload,
    rootEventId,
    threadPayload,
  };
}

const EMPTY_RESOLUTION: NoteContentResolution = { profilesByPubkey: {}, eventsById: {} };

export function mergeNoteContentResolution(
  base?: NoteContentResolution,
  extra?: NoteContentResolution
): NoteContentResolution {
  return {
    profilesByPubkey: { ...base?.profilesByPubkey, ...extra?.profilesByPubkey },
    eventsById: { ...base?.eventsById, ...extra?.eventsById },
  };
}

async function attachCommentCounts(comments: EventRecord[]): Promise<EventRecord[]> {
  const missing = comments.filter(
    (comment) =>
      typeof comment.id === "string" &&
      comment.id.length > 0 &&
      typeof comment.reply_count !== "number"
  );
  if (missing.length === 0) return [...comments];
  const loaded = await Promise.all(
    missing.map(async (comment) => {
      const id = comment.id as string;
      try {
        const counts = await getEventCounts(id, "shortTtl");
        return [id.toLowerCase(), counts] as const;
      } catch {
        return null;
      }
    })
  );
  const byId = new Map(
    loaded.filter(
      (entry): entry is readonly [string, Awaited<ReturnType<typeof getEventCounts>>] =>
        entry !== null
    )
  );
  if (byId.size === 0) return [...comments];
  return comments.map((comment) => {
    const id = typeof comment.id === "string" ? comment.id.toLowerCase() : "";
    const counts = byId.get(id);
    return counts ? applyEngagementStats(comment, counts) : comment;
  });
}

/**
 * Kind 1111 comments on this event, with the same engagement counters a reply
 * carries. Missing counts are filled from the counts route until the comments
 * payload includes them. Failures leave the conversation on replies alone.
 */
export async function loadNoteComments(eventId: string): Promise<{
  comments: EventRecord[];
  authorsByPubkey: Record<string, Profile>;
  contentResolution: NoteContentResolution;
}> {
  const empty = {
    comments: [] as EventRecord[],
    authorsByPubkey: {} as Record<string, Profile>,
    contentResolution: EMPTY_RESOLUTION,
  };
  const focal = eventId.toLowerCase();
  let comments: EventRecord[] = [];
  try {
    const payload = await getEventComments(eventId, "shortTtl");
    comments = (payload.comments ?? []).filter((comment) => {
      const id = typeof comment.id === "string" ? comment.id.toLowerCase() : "";
      return id.length > 0 && id !== focal;
    });
  } catch {
    return empty;
  }
  if (comments.length === 0) return empty;

  const [authorsByPubkey, contentResolution, withCounts] = await Promise.all([
    fetchProfilesByPubkey(
      listHydratablePubkeys(comments.flatMap((note) => (note.pubkey ? [note.pubkey] : []))),
      "shortTtl"
    ).catch(() => ({}) as Record<string, Profile>),
    resolveContentReferences(comments).catch(() => EMPTY_RESOLUTION),
    attachCommentCounts(comments),
  ]);

  const known = new Set(
    [...Object.keys(authorsByPubkey), ...Object.keys(contentResolution.profilesByPubkey ?? {})].map(
      (key) => key.toLowerCase()
    )
  );
  const quotedAuthorPubkeys = Object.values(contentResolution.eventsById ?? {})
    .map((event) => (typeof event?.pubkey === "string" ? event.pubkey : ""))
    .filter((pubkey) => pubkey.length > 0 && !known.has(pubkey.toLowerCase()));
  const quotedAuthors =
    quotedAuthorPubkeys.length > 0
      ? await fetchProfilesByPubkey(quotedAuthorPubkeys, "shortTtl").catch(
          () => ({}) as Record<string, Profile>
        )
      : {};

  return {
    comments: withCounts,
    authorsByPubkey,
    contentResolution: {
      profilesByPubkey: {
        ...contentResolution.profilesByPubkey,
        ...authorsByPubkey,
        ...quotedAuthors,
      },
      eventsById: contentResolution.eventsById,
    },
  };
}

/** One cursor page of replies. Omit `cursor` for the first page. */
export async function loadRepliesPage(eventId: string, cursor?: string) {
  const payload = await getEventReplies(eventId, "shortTtl", cursor ? { cursor } : undefined);
  const replies = payload.replies ?? [];

  let authorsByPubkey: Record<string, Profile> = {};
  try {
    authorsByPubkey = await fetchProfilesByPubkey(
      listHydratablePubkeys(replies.flatMap((note) => (note.pubkey ? [note.pubkey] : []))),
      "shortTtl"
    );
  } catch {
    authorsByPubkey = {};
  }

  const contentResolution = await resolveContentReferences(replies).catch(() => ({
    profilesByPubkey: {},
    eventsById: {},
  }));
  contentResolution.profilesByPubkey = {
    ...contentResolution.profilesByPubkey,
    ...authorsByPubkey,
  };

  return {
    authorsByPubkey,
    contentResolution,
    replies,
    repliesNextCursor: payload.next_cursor,
  };
}

/** Hotspot counts for the replies heading. The activity route does not return events. */
export const loadThreadActivityStats = cache(
  async (rootEventId: string): Promise<ThreadActivityStats> => {
    try {
      const payload = await getThreadActivity(rootEventId, "shortTtl");
      return {
        replies24h: typeof payload.replies_24h === "number" ? payload.replies_24h : undefined,
        replies7d: typeof payload.replies_7d === "number" ? payload.replies_7d : undefined,
        participantCount:
          typeof payload.participant_count === "number" ? payload.participant_count : undefined,
      };
    } catch {
      return {};
    }
  }
);

export async function loadNoteActivityData(
  rootEventId: string,
  resolvedSearchParams: Record<string, string | string[] | undefined>
) {
  const { activityCursor, includeThreadActivity } = readContextFlags(resolvedSearchParams);
  if (!includeThreadActivity) {
    return {
      activity: [] as EventRecord[],
      activityNextCursor: undefined as string | undefined,
      includeThreadActivity: false,
      threadActivityPayload: null,
      threadSummaryPayload: null,
      authorsByPubkey: {} as Record<string, Profile>,
      contentResolution: { profilesByPubkey: {}, eventsById: {} } as Awaited<
        ReturnType<typeof resolveContentReferences>
      >,
    };
  }

  const [threadSummaryResult, threadActivityResult] = await Promise.allSettled([
    getThreadSummary(rootEventId, "shortTtl"),
    getThreadActivity(rootEventId, "shortTtl", { cursor: activityCursor }),
  ]);

  const threadSummaryPayload =
    threadSummaryResult.status === "fulfilled" ? threadSummaryResult.value : null;
  const threadActivityPayload =
    threadActivityResult.status === "fulfilled" ? threadActivityResult.value : null;
  const activity = threadActivityPayload?.activity ?? [];

  let authorsByPubkey: Record<string, Profile> = {};
  try {
    authorsByPubkey = await fetchProfilesByPubkey(
      listHydratablePubkeys(activity.flatMap((note) => (note.pubkey ? [note.pubkey] : []))),
      "shortTtl"
    );
  } catch {
    authorsByPubkey = {};
  }
  const contentResolution = await resolveContentReferences(activity).catch(() => ({
    profilesByPubkey: {},
    eventsById: {},
  }));
  contentResolution.profilesByPubkey = {
    ...contentResolution.profilesByPubkey,
    ...authorsByPubkey,
  };

  return {
    activity,
    activityNextCursor: threadActivityPayload?.next_cursor,
    authorsByPubkey,
    contentResolution,
    includeThreadActivity: true,
    threadActivityPayload,
    threadSummaryPayload,
  };
}

export async function loadNoteRelatedData(
  eventId: string,
  resolvedSearchParams: Record<string, string | string[] | undefined>
) {
  const { relatedCursor, includeRelatedNotes } = readContextFlags(resolvedSearchParams);
  if (!includeRelatedNotes) {
    return {
      authorsByPubkey: {} as Record<string, Profile>,
      contentResolution: { profilesByPubkey: {}, eventsById: {} } as Awaited<
        ReturnType<typeof resolveContentReferences>
      >,
      includeRelatedNotes: false,
      relatedNextCursor: undefined as string | undefined,
      relatedNotes: [] as EventRecord[],
      relatedPayload: null,
    };
  }

  let relatedPayload: Awaited<ReturnType<typeof getRelatedNotes>> | null = null;
  try {
    relatedPayload = await getRelatedNotes(eventId, "shortTtl", { cursor: relatedCursor });
  } catch {
    relatedPayload = null;
  }

  const relatedNotes = (relatedPayload?.related ?? []).filter((note) => note.id !== eventId);
  let authorsByPubkey: Record<string, Profile> = {};
  try {
    authorsByPubkey = await fetchProfilesByPubkey(
      listHydratablePubkeys(relatedNotes.flatMap((note) => (note.pubkey ? [note.pubkey] : []))),
      "shortTtl"
    );
  } catch {
    authorsByPubkey = {};
  }
  const contentResolution = await resolveContentReferences(relatedNotes).catch(() => ({
    profilesByPubkey: {},
    eventsById: {},
  }));
  contentResolution.profilesByPubkey = {
    ...contentResolution.profilesByPubkey,
    ...authorsByPubkey,
  };

  return {
    authorsByPubkey,
    contentResolution,
    includeRelatedNotes: true,
    relatedNextCursor: relatedPayload?.next_cursor,
    relatedNotes,
    relatedPayload,
  };
}

/** Full loader kept for unit tests and any non-streaming callers. */
export async function loadNotePageData(
  eventId: string,
  resolvedSearchParams: Record<string, string | string[] | undefined>
) {
  const flags = readContextFlags(resolvedSearchParams);
  const [focal, thread, related] = await Promise.all([
    loadNoteFocalData(eventId),
    loadNoteThreadData(eventId, resolvedSearchParams),
    loadNoteRelatedData(eventId, resolvedSearchParams),
  ]);

  const rootEventId = focal.rootEventId ?? thread.rootEventId ?? eventId;
  const activityData = await loadNoteActivityData(rootEventId, resolvedSearchParams);

  const authorsByPubkey = {
    ...focal.authorsByPubkey,
    ...thread.authorsByPubkey,
    ...activityData.authorsByPubkey,
    ...related.authorsByPubkey,
  };
  const contentResolution = {
    profilesByPubkey: {
      ...focal.contentResolution.profilesByPubkey,
      ...thread.contentResolution.profilesByPubkey,
      ...authorsByPubkey,
    },
    eventsById: {
      ...focal.contentResolution.eventsById,
      ...thread.contentResolution.eventsById,
    },
  };

  const semantics = extractNativeApiSemantics(
    focal.noteSummary,
    focal.eventSeenOnPayload,
    focal.eventCountsPayload,
    thread.threadPayload,
    thread.ancestorsPayload,
    thread.repliesPayload,
    activityData.threadSummaryPayload,
    activityData.threadActivityPayload,
    related.relatedPayload,
    focal.eventPayload
  );

  return {
    activity: activityData.activity,
    activityNextCursor: activityData.activityNextCursor,
    ancestors: thread.ancestors,
    ancestorsPayload: thread.ancestorsPayload,
    authorsByPubkey,
    contentResolution,
    currentSearchParams: flags.currentSearchParams,
    errorMessage: [focal.errorMessage, thread.errorMessage].filter(Boolean).join(" | "),
    eventCountsPayload: focal.eventCountsPayload,
    eventPayload: focal.eventPayload,
    eventSeenOnPayload: focal.eventSeenOnPayload,
    focal: focal.focal ?? thread.threadPayload?.root,
    includeRelatedNotes: related.includeRelatedNotes,
    includeThreadActivity: activityData.includeThreadActivity,
    missingAncestorIds: thread.missingAncestorIds,
    noteSummary: focal.noteSummary,
    relatedNextCursor: related.relatedNextCursor,
    relatedNotes: related.relatedNotes,
    relatedPayload: related.relatedPayload,
    replies: thread.replies,
    repliesNextCursor: thread.repliesNextCursor,
    repliesPayload: thread.repliesPayload,
    resolvedAuthor: focal.resolvedAuthor,
    semantics,
    summaryProvenance: focal.summaryProvenance,
    threadActivityPayload: activityData.threadActivityPayload,
    threadPayload: thread.threadPayload,
    threadSummaryPayload: activityData.threadSummaryPayload,
  };
}
