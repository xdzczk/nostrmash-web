import type {
  EventAncestorsResponse,
  EventCountsResponse,
  EventRepliesResponse,
  EventSeenOnResponse,
  NoteSummaryResponse,
  RelatedNotesResponse,
  ThreadActivityResponse,
  ThreadResponse,
  ThreadSummaryResponse,
} from "@/lib/types/api";
import {
  asArray,
  asBoolean,
  asNumber,
  asRecord,
  asString,
  compactDefined,
} from "@/lib/api/normalize/helpers";
import {
  normalizeEventRecord,
  normalizeEventRecords,
  normalizeProfile,
  normalizeProfileStats,
} from "@/lib/api/normalize/entities";
import { normalizeRelayObservation } from "@/lib/api/normalize/relays";

export function normalizeThreadResponse(value: unknown): ThreadResponse {
  const record = asRecord(value) ?? {};
  const event = normalizeEventRecord(record.event);

  return {
    ...record,
    event: event ?? undefined,
    root: event ?? undefined,
    ancestors: normalizeEventRecords(record.ancestors),
    replies: normalizeEventRecords(record.replies),
  };
}

export function normalizeEventAncestorsResponse(value: unknown): EventAncestorsResponse {
  const record = asRecord(value) ?? {};
  const context = asRecord(record.context);
  const missingAncestorIds = asArray(
    record.missing_ancestor_ids ?? context?.missing_ancestor_ids ?? record.missing
  ).filter((entry): entry is string => typeof entry === "string" && entry.length > 0);

  return {
    ...record,
    event: normalizeEventRecord(record.event ?? record.note) ?? undefined,
    ancestors: normalizeEventRecords(record.ancestors ?? context?.ancestors ?? record.events),
    missing_ancestor_ids: missingAncestorIds.length > 0 ? missingAncestorIds : undefined,
  };
}

export function normalizeEventRepliesResponse(value: unknown): EventRepliesResponse {
  const record = asRecord(value) ?? {};
  const thread = asRecord(record.thread);
  const rootEventId = asString(record.root_event_id) ?? asString(thread?.root_event_id);

  return {
    ...record,
    event: normalizeEventRecord(record.event ?? record.note) ?? undefined,
    root_event_id: rootEventId,
    replies: normalizeEventRecords(
      record.replies ?? record.notes ?? record.events ?? record.children ?? thread?.replies
    ),
  };
}

export function normalizeThreadSummaryResponse(value: unknown): ThreadSummaryResponse {
  const record = asRecord(value) ?? {};
  const summaryRecord = asRecord(record.summary) ?? asRecord(record.thread_summary);
  const countsRecord = asRecord(record.counts) ?? asRecord(summaryRecord?.counts);
  const rootEventId = asString(record.root_event_id) ?? asString(summaryRecord?.root_event_id);

  return {
    ...record,
    root_event_id: rootEventId,
    summary: summaryRecord ?? undefined,
    counts: countsRecord ?? undefined,
  };
}

export function normalizeThreadActivityResponse(value: unknown): ThreadActivityResponse {
  const record = asRecord(value) ?? {};
  const timeline = asRecord(record.timeline);
  const rootEventId =
    asString(record.root_event_id) ??
    asString(asRecord(record.thread)?.root_event_id) ??
    asString(timeline?.root_event_id);

  return {
    ...record,
    root_event_id: rootEventId,
    activity: normalizeEventRecords(
      record.activity ?? record.events ?? record.notes ?? timeline?.events
    ),
  };
}

export function normalizeRelatedNotesResponse(value: unknown): RelatedNotesResponse {
  const record = asRecord(value) ?? {};
  const note = asRecord(record.note);
  const eventId = asString(record.event_id) ?? asString(note?.id) ?? asString(record.id);

  return {
    ...record,
    event_id: eventId,
    related: normalizeEventRecords(
      record.related ?? record.related_notes ?? record.notes ?? record.events
    ),
  };
}

export function normalizeNoteSummaryResponse(value: unknown): NoteSummaryResponse {
  const record = asRecord(value) ?? {};
  const event = normalizeEventRecord(record.event);
  const author = asRecord(record.author);
  const authorProfile = normalizeProfile(author);
  const authorStats = normalizeProfileStats(author?.stats);
  const counts = asRecord(record.counts);
  const media = asRecord(record.media);
  const thread = asRecord(record.thread);
  const conversationActivity = asRecord(record.conversation_activity);
  const summary = compactDefined({
    reply_count: asNumber(counts?.reply_count),
    reaction_count: asNumber(counts?.reaction_count),
    repost_count: asNumber(counts?.repost_count),
    zap_count: asNumber(counts?.zap_count),
    zap_msats: asNumber(counts?.zap_msats),
    has_image: asBoolean(media?.has_image),
    has_video: asBoolean(media?.has_video),
    has_link: asBoolean(media?.has_link),
    has_article: asBoolean(media?.has_article),
    attachment_count: asNumber(media?.attachment_count),
    replies_24h: asNumber(conversationActivity?.replies_24h),
    replies_7d: asNumber(conversationActivity?.replies_7d),
    root_event_id: asString(thread?.root_event_id),
    parent_event_id: asString(thread?.parent_event_id),
  });

  return {
    ...record,
    event: event ?? undefined,
    note: event ?? undefined,
    author: author
      ? {
          ...author,
          pubkey: asString(author.pubkey) ?? authorProfile?.pubkey,
          profile: authorProfile ?? undefined,
          stats: authorStats,
        }
      : undefined,
    counts: counts ?? undefined,
    media: media ?? undefined,
    thread: thread ?? undefined,
    summary,
  };
}

export function normalizeEventSeenOnResponse(value: unknown): EventSeenOnResponse {
  const record = asRecord(value) ?? {};
  const candidateRelays =
    record.relays ?? record.seen_on ?? record.seenOn ?? record.observations ?? record.entries;
  const relays = asArray(candidateRelays)
    .map((entry) => normalizeRelayObservation(entry))
    .filter(
      (entry): entry is { relay_url?: string; seen_at?: string | number; [key: string]: unknown } =>
        entry !== null
    );

  return {
    ...record,
    relays: relays.length > 0 ? relays : undefined,
  };
}

export function normalizeEventCountsResponse(value: unknown): EventCountsResponse {
  const record = asRecord(value) ?? {};
  const countsRecord = asRecord(record.counts);
  if (countsRecord) {
    return {
      ...record,
      counts: countsRecord,
    };
  }

  const counts = compactDefined({
    reply_count: asNumber(record.reply_count) ?? asNumber(record.replies),
    reaction_count: asNumber(record.reaction_count) ?? asNumber(record.reactions),
    repost_count: asNumber(record.repost_count) ?? asNumber(record.reposts),
    zap_count: asNumber(record.zap_count) ?? asNumber(record.zaps),
    zap_msats: asNumber(record.zap_msats),
    quote_count: asNumber(record.quote_count) ?? asNumber(record.quotes),
  });

  return {
    ...record,
    counts: Object.keys(counts).length > 0 ? counts : undefined,
  };
}
