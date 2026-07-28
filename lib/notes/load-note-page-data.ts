import { cache } from "react";

import { isRecord } from "@/lib/api/normalize/helpers";
import {
  getEventAncestors,
  getEvent,
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

  const contentResolution = await resolveContentReferences(
    typeof focal?.content === "string" && focal.content.length > 0 ? [focal.content] : []
  ).catch(() => ({ profilesByPubkey: {}, eventsById: {} }));
  contentResolution.profilesByPubkey = {
    ...contentResolution.profilesByPubkey,
    ...authorsByPubkey,
  };

  const threadContextFromSummary = isRecord(noteSummary?.thread) ? noteSummary.thread : {};
  const rootEventId =
    typeof threadContextFromSummary.root_event_id === "string"
      ? threadContextFromSummary.root_event_id
      : undefined;
  const parentEventId =
    typeof threadContextFromSummary.parent_event_id === "string"
      ? threadContextFromSummary.parent_event_id
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
    [...ancestors, ...replies]
      .map((note) => note.content)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
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

  return {
    activity,
    activityNextCursor: threadActivityPayload?.next_cursor,
    authorsByPubkey,
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

  return {
    authorsByPubkey,
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
