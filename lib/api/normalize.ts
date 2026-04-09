import type {
  DiscoveryHomeResponse,
  EventCountsResponse,
  EventRecord,
  EventSeenOnResponse,
  HashtagEntry,
  NativeApiSemantics,
  NoteSummaryResponse,
  Profile,
  ProfileSummaryResponse,
  ProfileStats,
  ThreadResponse,
} from "@/lib/types/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function compactDefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

const NATIVE_SEMANTIC_KEYS = [
  "consistency",
  "trust_mode",
  "trust_applied",
  "result_scope",
  "next_cursor",
] as const;

const CURSOR_ALIASES = ["next_cursor", "cursor", "continuation", "next"] as const;

function extractCursorLikeValue(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  for (const key of CURSOR_ALIASES) {
    const candidate = asString(record[key]);
    if (candidate) return candidate;
  }
  return undefined;
}

export function extractNativeApiSemantics(...values: unknown[]): NativeApiSemantics {
  const semantics: NativeApiSemantics = {};

  for (const value of values) {
    const record = asRecord(value);
    if (!record) continue;
    const meta = asRecord(record.meta);
    for (const key of NATIVE_SEMANTIC_KEYS) {
      if (semantics[key] !== undefined) continue;
      if (record[key] !== undefined) {
        semantics[key] = record[key] as never;
        continue;
      }
      if (meta?.[key] !== undefined) {
        semantics[key] = meta[key] as never;
      }
    }
    if (!semantics.next_cursor) {
      semantics.next_cursor = extractCursorLikeValue(record) ?? extractCursorLikeValue(meta);
    }
  }

  return semantics;
}

export function normalizeEventRecord(value: unknown): EventRecord | null {
  const record = asRecord(value);
  if (!record) return null;

  return {
    ...record,
    id:
      asString(record.id) ??
      asString(record.event_id) ??
      asString(record.eventId) ??
      asString(record.note_id) ??
      asString(record.noteId) ??
      "",
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
  };
}

export function normalizeEventRecords(value: unknown): EventRecord[] {
  return asArray(value)
    .map((entry) => normalizeEventRecord(entry))
    .filter((entry): entry is EventRecord => entry !== null);
}

export function normalizeProfile(value: unknown): Profile | null {
  const record = asRecord(value);
  if (!record) return null;

  const embeddedProfile = asRecord(record.profile);
  const normalized = {
    ...(embeddedProfile ?? {}),
    ...record,
    pubkey: asString(record.pubkey) ?? asString(embeddedProfile?.pubkey) ?? "",
  };

  return normalized as Profile;
}

export function normalizeProfiles(value: unknown): Profile[] {
  return asArray(value)
    .map((entry) => normalizeProfile(entry))
    .filter((entry): entry is Profile => entry !== null);
}

export function normalizeProfileStats(value: unknown): ProfileStats | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  return compactDefined({
    follower_count: asNumber(record.follower_count),
    following_count: asNumber(record.following_count),
    note_count: asNumber(record.note_count),
    reply_count: asNumber(record.reply_count),
    recent_activity_at: asNumber(record.recent_activity_at),
    relay_count: asNumber(record.relay_count),
  });
}

export function normalizeHashtagEntry(value: unknown): HashtagEntry | null {
  if (typeof value === "string") {
    return { hashtag: value };
  }

  const record = asRecord(value);
  if (!record) return null;

  return {
    ...record,
    hashtag: asString(record.hashtag),
    count: asNumber(record.count) ?? asNumber(record.event_count),
  };
}

export function normalizeHashtagEntries(value: unknown): HashtagEntry[] {
  return asArray(value)
    .map((entry) => normalizeHashtagEntry(entry))
    .filter((entry): entry is HashtagEntry => entry !== null);
}

export function normalizeDiscoveryHomeResponse(
  value: DiscoveryHomeResponse
): DiscoveryHomeResponse {
  const record = asRecord(value) ?? {};
  const sections = asRecord(record.sections);
  const networkSummary = asRecord(sections?.network_summary);
  const activity = asRecord(networkSummary?.activity);
  const activeAuthors = asRecord(activity?.active_authors);
  const noteVolume = asRecord(activity?.note_volume);
  const relays = asRecord(networkSummary?.relays);
  const uniqueAuthors = asRecord(relays?.unique_authors);
  const totals = asRecord(networkSummary?.totals);
  const sectionProfiles = asRecord(sections?.profiles);

  const stats = compactDefined({
    events_ingested: asNumber(totals?.events_ingested),
    projected_profiles: asNumber(totals?.projected_profiles),
    active_authors_24h: asNumber(activeAuthors?.["24h"]),
    note_volume_24h: asNumber(noteVolume?.["24h"]),
    relays_active_24h: asNumber(relays?.active_24h),
    unique_authors_24h: asNumber(uniqueAuthors?.["24h"]),
  });

  return {
    ...record,
    notes: normalizeEventRecords(sections?.trending_notes ?? record.trending_notes ?? record.notes),
    profiles: normalizeProfiles(
      sectionProfiles?.trending ?? record.trending_profiles ?? record.profiles
    ),
    hashtags: normalizeHashtagEntries(
      sections?.trending_hashtags ?? record.trending_hashtags ?? record.hashtags
    ),
    stats,
  };
}

export function normalizeProfileSummaryResponse(value: unknown): ProfileSummaryResponse {
  const record = asRecord(value) ?? {};
  const profile = normalizeProfile(record);
  const stats = normalizeProfileStats(record.stats);

  return {
    ...record,
    ...(profile ?? {}),
    ...(stats ?? {}),
    pubkey: asString(record.pubkey) ?? profile?.pubkey,
    profile: profile ?? undefined,
    stats,
  };
}

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

function normalizeRelayObservation(
  value: unknown
): { relay_url?: string; seen_at?: string | number; [key: string]: unknown } | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return { relay_url: value.trim() };
  }

  const record = asRecord(value);
  if (!record) return null;

  const relayUrl =
    asString(record.relay_url) ??
    asString(record.url) ??
    asString(record.relay) ??
    asString(record.host) ??
    asString(record.name);
  const seenAt =
    asString(record.seen_at) ??
    asNumber(record.seen_at) ??
    asString(record.last_seen_at) ??
    asNumber(record.last_seen_at) ??
    asString(record.first_seen_at) ??
    asNumber(record.first_seen_at);

  return compactDefined({
    ...record,
    relay_url: relayUrl,
    seen_at: seenAt,
  });
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
