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
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
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

export async function loadNotePageData(
  eventId: string,
  resolvedSearchParams: Record<string, string | string[] | undefined>
) {
  const repliesCursor = readSearchParam(resolvedSearchParams, "replies_cursor");
  const activityCursor = readSearchParam(resolvedSearchParams, "activity_cursor");
  const relatedCursor = readSearchParam(resolvedSearchParams, "related_cursor");
  const viewMode = readSearchParam(resolvedSearchParams, "view");
  const includeExtendedContext = viewMode === "full";
  const includeThreadActivity = includeExtendedContext || typeof activityCursor === "string";
  const includeRelatedNotes = includeExtendedContext || typeof relatedCursor === "string";
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);

  let errorMessage = "";
  let eventPayload: Awaited<ReturnType<typeof getEvent>> | null = null;
  let eventSeenOnPayload: Awaited<ReturnType<typeof getEventSeenOn>> | null = null;
  let eventCountsPayload: Awaited<ReturnType<typeof getEventCounts>> | null = null;
  let noteSummary: Awaited<ReturnType<typeof getNoteSummary>> | null = null;
  let threadPayload: Awaited<ReturnType<typeof getThread>> | null = null;
  let ancestorsPayload: Awaited<ReturnType<typeof getEventAncestors>> | null = null;
  let repliesPayload: Awaited<ReturnType<typeof getEventReplies>> | null = null;
  let relatedPayload: Awaited<ReturnType<typeof getRelatedNotes>> | null = null;
  let threadSummaryPayload: Awaited<ReturnType<typeof getThreadSummary>> | null = null;
  let threadActivityPayload: Awaited<ReturnType<typeof getThreadActivity>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};

  const [noteSummaryResult, threadResult, ancestorsResult, repliesResult, relatedResult] =
    await Promise.allSettled([
      getNoteSummaryCached(eventId),
      getThread(eventId, "shortTtl"),
      getEventAncestors(eventId, "shortTtl"),
      getEventReplies(eventId, "shortTtl", { cursor: repliesCursor }),
      includeRelatedNotes
        ? getRelatedNotes(eventId, "shortTtl", { cursor: relatedCursor })
        : Promise.resolve(null),
    ]);

  if (noteSummaryResult.status === "fulfilled") {
    noteSummary = noteSummaryResult.value;
  }
  if (threadResult.status === "fulfilled") {
    threadPayload = threadResult.value;
  }
  if (ancestorsResult.status === "fulfilled") {
    ancestorsPayload = ancestorsResult.value;
  }
  if (repliesResult.status === "fulfilled") {
    repliesPayload = repliesResult.value;
  }
  if (relatedResult.status === "fulfilled") {
    relatedPayload = relatedResult.value;
  }

  const focalFromPrimary = noteSummary?.note ?? threadPayload?.root;
  const shouldFetchCanonicalEvent = !hasCanonicalPayloadFields(focalFromPrimary, eventId);
  const shouldFetchCounts =
    !isRecord(noteSummary?.counts) || Object.keys(noteSummary.counts).length === 0;
  const summaryProvenance = isRecord(noteSummary?.provenance) ? noteSummary.provenance : undefined;
  const summaryRelayHints =
    (isRecord(noteSummary) && Array.isArray((noteSummary as Record<string, unknown>).seen_on)) ||
    (isRecord(summaryProvenance) && Array.isArray(summaryProvenance.relays));
  const shouldFetchSeenOn = !summaryRelayHints;
  const enrichmentErrors: string[] = [];

  const [eventResult, seenOnResult, countsResult] = await Promise.allSettled([
    shouldFetchCanonicalEvent ? getEvent(eventId, "shortTtl") : Promise.resolve(null),
    shouldFetchSeenOn ? getEventSeenOn(eventId, "shortTtl") : Promise.resolve(null),
    shouldFetchCounts ? getEventCounts(eventId, "shortTtl") : Promise.resolve(null),
  ]);

  if (eventResult.status === "fulfilled") {
    eventPayload = eventResult.value;
  } else if (shouldFetchCanonicalEvent) {
    enrichmentErrors.push(toUserFacingErrorMessage(eventResult.reason, ""));
  }
  if (seenOnResult.status === "fulfilled") {
    eventSeenOnPayload = seenOnResult.value;
  } else if (shouldFetchSeenOn) {
    enrichmentErrors.push(toUserFacingErrorMessage(seenOnResult.reason, ""));
  }
  if (countsResult.status === "fulfilled") {
    eventCountsPayload = countsResult.value;
  } else if (shouldFetchCounts) {
    enrichmentErrors.push(toUserFacingErrorMessage(countsResult.reason, ""));
  }

  if (!noteSummary && noteSummaryResult.status === "rejected") {
    enrichmentErrors.unshift(
      toUserFacingErrorMessage(noteSummaryResult.reason, "Failed to load note summary.")
    );
  }
  if (!threadPayload && threadResult.status === "rejected") {
    enrichmentErrors.unshift(
      toUserFacingErrorMessage(threadResult.reason, "Failed to load note thread.")
    );
  }
  if (!ancestorsPayload && ancestorsResult.status === "rejected") {
    enrichmentErrors.push(
      toUserFacingErrorMessage(ancestorsResult.reason, "Failed to load ancestors.")
    );
  }
  if (!repliesPayload && repliesResult.status === "rejected") {
    enrichmentErrors.push(
      toUserFacingErrorMessage(repliesResult.reason, "Failed to load replies.")
    );
  }
  if (!relatedPayload && relatedResult.status === "rejected") {
    enrichmentErrors.push(
      toUserFacingErrorMessage(relatedResult.reason, "Failed to load related notes.")
    );
  }
  const compactErrors = enrichmentErrors.filter((value) => value.length > 0);
  if (!noteSummary && !threadPayload && !eventPayload && compactErrors.length > 0) {
    errorMessage = compactErrors.join(" | ");
  }

  const threadContextFromSummary = isRecord(noteSummary?.thread) ? noteSummary.thread : {};
  const rootEventIdCandidate =
    (typeof threadContextFromSummary.root_event_id === "string"
      ? threadContextFromSummary.root_event_id
      : undefined) ??
    repliesPayload?.root_event_id ??
    threadPayload?.root?.id ??
    ancestorsPayload?.ancestors?.[0]?.id;

  if (rootEventIdCandidate && includeThreadActivity) {
    const [threadSummaryResult, threadActivityResult] = await Promise.allSettled([
      getThreadSummary(rootEventIdCandidate, "shortTtl"),
      getThreadActivity(rootEventIdCandidate, "shortTtl", { cursor: activityCursor }),
    ]);
    if (threadSummaryResult.status === "fulfilled") {
      threadSummaryPayload = threadSummaryResult.value;
    } else {
      enrichmentErrors.push(
        toUserFacingErrorMessage(threadSummaryResult.reason, "Failed to load thread summary.")
      );
    }
    if (threadActivityResult.status === "fulfilled") {
      threadActivityPayload = threadActivityResult.value;
    } else {
      enrichmentErrors.push(
        toUserFacingErrorMessage(threadActivityResult.reason, "Failed to load thread activity.")
      );
    }
  }

  const authorProfileFromSummary =
    isRecord(noteSummary?.author) && isRecord(noteSummary.author.profile)
      ? (noteSummary.author.profile as Profile)
      : undefined;

  try {
    authorsByPubkey = await fetchProfilesByPubkey(
      listHydratablePubkeys(
        [
          eventPayload?.event,
          noteSummary?.note,
          threadPayload?.root,
          ...(ancestorsPayload?.ancestors ?? threadPayload?.ancestors ?? []),
          ...(repliesPayload?.replies ?? threadPayload?.replies ?? []),
          ...(threadActivityPayload?.activity ?? []),
          ...(relatedPayload?.related ?? []),
          authorProfileFromSummary,
        ].flatMap((note) => (note?.pubkey ? [note.pubkey] : []))
      ),
      "shortTtl"
    );
  } catch {
    authorsByPubkey = {};
  }

  if (authorProfileFromSummary?.pubkey) {
    authorsByPubkey[authorProfileFromSummary.pubkey.toLowerCase()] = authorProfileFromSummary;
  }

  const focal = noteSummary?.note ?? eventPayload?.event ?? threadPayload?.root;
  const ancestors = ancestorsPayload?.ancestors ?? threadPayload?.ancestors ?? [];
  const replies = repliesPayload?.replies ?? threadPayload?.replies ?? [];
  const missingAncestorIds =
    ancestorsPayload?.missing_ancestor_ids ?? threadPayload?.missing_ancestor_ids ?? [];
  const activity = threadActivityPayload?.activity ?? [];
  const relatedNotes = (relatedPayload?.related ?? []).filter((note) => note.id !== focal?.id);
  const repliesNextCursor = repliesPayload?.next_cursor ?? threadPayload?.next_cursor;
  const activityNextCursor = threadActivityPayload?.next_cursor;
  const relatedNextCursor = relatedPayload?.next_cursor;
  const semantics = extractNativeApiSemantics(
    noteSummary,
    eventSeenOnPayload,
    eventCountsPayload,
    threadPayload,
    ancestorsPayload,
    repliesPayload,
    threadSummaryPayload,
    threadActivityPayload,
    relatedPayload,
    eventPayload
  );
  const resolvedAuthor =
    (typeof focal?.pubkey === "string" ? authorsByPubkey[focal.pubkey.toLowerCase()] : undefined) ??
    authorProfileFromSummary;

  const contentBodies = [
    focal?.content,
    ...ancestors.map((note) => note.content),
    ...replies.map((note) => note.content),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  const contentResolution = await resolveContentReferences(contentBodies).catch(() => ({
    profilesByPubkey: {},
    eventsById: {},
  }));

  // Prefer already-hydrated authors when available.
  contentResolution.profilesByPubkey = {
    ...contentResolution.profilesByPubkey,
    ...authorsByPubkey,
  };

  return {
    activity,
    activityNextCursor,
    ancestors,
    ancestorsPayload,
    authorsByPubkey,
    contentResolution,
    currentSearchParams,
    errorMessage,
    eventCountsPayload,
    eventPayload,
    eventSeenOnPayload,
    focal,
    includeRelatedNotes,
    includeThreadActivity,
    missingAncestorIds,
    noteSummary,
    relatedNextCursor,
    relatedNotes,
    relatedPayload,
    replies,
    repliesNextCursor,
    repliesPayload,
    resolvedAuthor,
    semantics,
    summaryProvenance,
    threadActivityPayload,
    threadPayload,
    threadSummaryPayload,
  };
}
