import type {
  AuthorAnalyticsResponse,
  AuthorEventsResponse,
  AuthorRepliesResponse,
  ContactListContextResponse,
  DiscoveryHomeResponse,
  DomainDetailResponse,
  DomainEntry,
  DomainNotesResponse,
  EventAncestorsResponse,
  EventCountsResponse,
  EventRecord,
  EventRepliesResponse,
  EventSeenOnResponse,
  HashtagEntry,
  HashtagDetailResponse,
  HashtagNotesResponse,
  NativeApiSemantics,
  NoteSummaryResponse,
  Profile,
  ProfileFollowersResponse,
  ProfileMentionsResponse,
  ProfileSummaryResponse,
  ProfileStats,
  ProfileTopicsResponse,
  RelayListContextResponse,
  RelayListEntry,
  RelayHealthResponse,
  RelatedHashtagsResponse,
  RelatedProfilesResponse,
  RelatedNotesResponse,
  ThreadResponse,
  ThreadActivityResponse,
  ThreadSummaryResponse,
  TrustScoreResponse,
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

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const candidate = asString(value);
    if (candidate) return candidate;
  }
  return undefined;
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
  const metadataRecord =
    asRecord(record.metadata) ??
    parseJsonRecord(record.metadata) ??
    asRecord(embeddedProfile?.metadata) ??
    parseJsonRecord(embeddedProfile?.metadata);
  const metadataFromContent =
    parseJsonRecord(record.content) ?? parseJsonRecord(embeddedProfile?.content);
  const profilePayload = {
    ...(metadataRecord ?? {}),
    ...(metadataFromContent ?? {}),
    ...(embeddedProfile ?? {}),
    ...record,
  };
  const asProfileRecord = profilePayload as Record<string, unknown>;
  const normalized = {
    ...profilePayload,
    pubkey:
      firstString(
        asProfileRecord.pubkey,
        asProfileRecord.author_pubkey,
        asProfileRecord.authorPubkey
      ) ?? "",
    npub: firstString(asProfileRecord.npub, asProfileRecord.npub_hex, asProfileRecord.npubHex),
    display_name: firstString(
      asProfileRecord.display_name,
      asProfileRecord.displayName,
      asProfileRecord.display,
      asProfileRecord.displayname
    ),
    name: firstString(
      asProfileRecord.name,
      asProfileRecord.username,
      asProfileRecord.user_name,
      asProfileRecord.handle
    ),
    picture: firstString(
      asProfileRecord.picture,
      asProfileRecord.image,
      asProfileRecord.avatar,
      asProfileRecord.avatar_url,
      asProfileRecord.avatarUrl,
      asProfileRecord.pfp,
      asProfileRecord.picture_url,
      asProfileRecord.pictureUrl,
      asProfileRecord.profile_image,
      asProfileRecord.profile_picture
    ),
    about: firstString(asProfileRecord.about, asProfileRecord.description, asProfileRecord.bio),
    nip05: firstString(asProfileRecord.nip05, asProfileRecord.nip_05),
    lud16: firstString(asProfileRecord.lud16, asProfileRecord.lightning, asProfileRecord.lnurl),
    website: firstString(
      asProfileRecord.website,
      asProfileRecord.url,
      asProfileRecord.web,
      asProfileRecord.homepage
    ),
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

function normalizeDomainLabel(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return undefined;
  const withoutTrailingPunctuation = trimmed.replace(/[),.;!?]+$/g, "");
  const candidate = withoutTrailingPunctuation.includes("://")
    ? withoutTrailingPunctuation
    : `https://${withoutTrailingPunctuation}`;
  try {
    const hostname = new URL(candidate).hostname.toLowerCase().replace(/\.$/, "");
    return hostname.length > 0 ? hostname : undefined;
  } catch {
    const fallbackHost = withoutTrailingPunctuation
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    const fallback = (fallbackHost ?? "").replace(/\.$/, "");
    return fallback.length > 0 ? fallback : undefined;
  }
}

export function normalizeDomainEntry(value: unknown): DomainEntry | null {
  if (typeof value === "string") {
    const domain = normalizeDomainLabel(value);
    return domain ? { domain } : null;
  }

  const record = asRecord(value);
  if (!record) return null;

  const domain =
    normalizeDomainLabel(record.domain) ??
    normalizeDomainLabel(record.host) ??
    normalizeDomainLabel(record.hostname) ??
    normalizeDomainLabel(record.site) ??
    normalizeDomainLabel(record.url);

  return compactDefined({
    ...record,
    domain,
    count: asNumber(record.count) ?? asNumber(record.event_count),
    event_count: asNumber(record.event_count) ?? asNumber(record.count),
    unique_authors: asNumber(record.unique_authors) ?? asNumber(record.unique_profiles),
  });
}

export function normalizeDomainEntries(value: unknown): DomainEntry[] {
  return asArray(value)
    .map((entry) => normalizeDomainEntry(entry))
    .filter((entry): entry is DomainEntry => entry !== null);
}

export function normalizeHashtagDetailResponse(value: unknown): HashtagDetailResponse {
  const record = asRecord(value) ?? {};
  const hashtag =
    asString(record.hashtag) ??
    asString(record.tag) ??
    asString(record.topic) ??
    asString(asRecord(record.hashtag_entry)?.hashtag);
  const related = normalizeHashtagEntries(
    record.related ??
      record.related_hashtags ??
      record.hashtags ??
      asRecord(record.context)?.related
  );
  const notes = normalizeEventRecords(
    record.notes ??
      record.events ??
      record.items ??
      record.data ??
      asRecord(record.context)?.notes ??
      asRecord(record.context)?.events
  );
  const count = asNumber(record.count) ?? asNumber(record.event_count) ?? asNumber(record.total);
  const uniqueAuthors = asNumber(record.unique_authors) ?? asNumber(record.unique_profiles);
  const total = asNumber(record.total) ?? (notes.length > 0 ? notes.length : undefined);

  return compactDefined({
    ...record,
    hashtag,
    count,
    event_count: count,
    unique_authors: uniqueAuthors,
    related: related.length > 0 ? related : undefined,
    notes: notes.length > 0 ? notes : undefined,
    total,
  });
}

export function normalizeHashtagNotesResponse(value: unknown): HashtagNotesResponse {
  const record = asRecord(value) ?? {};
  const hashtag =
    asString(record.hashtag) ??
    asString(record.tag) ??
    asString(record.topic) ??
    asString(asRecord(record.context)?.hashtag);
  const notes = normalizeEventRecords(
    record.notes ?? record.events ?? record.items ?? record.data ?? asRecord(record.context)?.notes
  );
  const total = asNumber(record.total) ?? (notes.length > 0 ? notes.length : undefined);

  return compactDefined({
    ...record,
    hashtag,
    notes,
    total,
  });
}

export function normalizeRelatedHashtagsResponse(value: unknown): RelatedHashtagsResponse {
  const record = asRecord(value) ?? {};
  const hashtag =
    asString(record.hashtag) ??
    asString(record.tag) ??
    asString(record.topic) ??
    asString(asRecord(record.context)?.hashtag);
  const related = normalizeHashtagEntries(
    record.related ?? record.related_hashtags ?? record.hashtags ?? record.items ?? record.data
  );
  const total = asNumber(record.total) ?? (related.length > 0 ? related.length : undefined);

  return compactDefined({
    ...record,
    hashtag,
    related,
    hashtags: related,
    total,
  });
}

export function normalizeDomainDetailResponse(value: unknown): DomainDetailResponse {
  const record = asRecord(value) ?? {};
  const domain =
    normalizeDomainLabel(record.domain) ??
    normalizeDomainLabel(record.host) ??
    normalizeDomainLabel(record.hostname) ??
    normalizeDomainLabel(record.site) ??
    normalizeDomainLabel(record.url) ??
    normalizeDomainLabel(asRecord(record.context)?.domain);
  const notes = normalizeEventRecords(
    record.notes ??
      record.events ??
      record.items ??
      record.data ??
      asRecord(record.context)?.notes ??
      asRecord(record.context)?.events
  );
  const count = asNumber(record.count) ?? asNumber(record.event_count) ?? asNumber(record.total);
  const uniqueAuthors = asNumber(record.unique_authors) ?? asNumber(record.unique_profiles);
  const total = asNumber(record.total) ?? (notes.length > 0 ? notes.length : undefined);

  return compactDefined({
    ...record,
    domain,
    count,
    event_count: count,
    unique_authors: uniqueAuthors,
    notes: notes.length > 0 ? notes : undefined,
    total,
  });
}

export function normalizeDomainNotesResponse(value: unknown): DomainNotesResponse {
  const record = asRecord(value) ?? {};
  const domain =
    normalizeDomainLabel(record.domain) ??
    normalizeDomainLabel(record.host) ??
    normalizeDomainLabel(record.hostname) ??
    normalizeDomainLabel(record.site) ??
    normalizeDomainLabel(record.url) ??
    normalizeDomainLabel(asRecord(record.context)?.domain);
  const notes = normalizeEventRecords(
    record.notes ?? record.events ?? record.items ?? record.data ?? asRecord(record.context)?.notes
  );
  const total = asNumber(record.total) ?? (notes.length > 0 ? notes.length : undefined);

  return compactDefined({
    ...record,
    domain,
    notes,
    total,
  });
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
    domains: normalizeDomainEntries(
      sections?.trending_domains ?? sections?.domains ?? record.trending_domains ?? record.domains
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

export function normalizeAuthorEventsResponse(value: unknown): AuthorEventsResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    events: normalizeEventRecords(
      record.events ?? record.notes ?? record.items ?? record.data ?? fallbackItems
    ),
  };
}

export function normalizeAuthorRepliesResponse(value: unknown): AuthorRepliesResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    replies: normalizeEventRecords(
      record.replies ??
        record.events ??
        record.notes ??
        record.items ??
        record.data ??
        fallbackItems
    ),
  };
}

export function normalizeAuthorAnalyticsResponse(value: unknown): AuthorAnalyticsResponse {
  const record = asRecord(value) ?? {};
  const analytics = asRecord(record.analytics);
  const payload = analytics ?? record;

  return {
    ...record,
    ...(analytics ?? {}),
    pubkey:
      asString(record.pubkey) ??
      asString(record.author_pubkey) ??
      asString(payload.pubkey) ??
      asString(payload.author_pubkey),
  };
}

export function normalizeTrustScoreResponse(value: unknown): TrustScoreResponse {
  const record = asRecord(value) ?? {};
  const scoreContainer =
    asRecord(record.trust) ?? asRecord(record.score) ?? asRecord(record.metadata) ?? undefined;
  const payload = scoreContainer ?? record;
  const trustScoreValue =
    asNumber(record.trust_score) ??
    asString(record.trust_score) ??
    asNumber(record.score) ??
    asString(record.score) ??
    asNumber(payload.trust_score) ??
    asString(payload.trust_score) ??
    asNumber(payload.score) ??
    asString(payload.score);

  return compactDefined({
    ...record,
    pubkey:
      asString(record.pubkey) ??
      asString(record.author_pubkey) ??
      asString(payload.pubkey) ??
      asString(payload.author_pubkey),
    trust_score: trustScoreValue,
    score:
      trustScoreValue ??
      asNumber(record.score) ??
      asString(record.score) ??
      asNumber(payload.score) ??
      asString(payload.score),
    metadata: asRecord(record.metadata) ?? asRecord(record.trust_metadata) ?? scoreContainer,
  });
}

function normalizeStringArray(value: unknown): string[] {
  return asArray(value)
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());
}

function dedupeProfilesByPubkey(profiles: Profile[]): Profile[] {
  const keyedProfiles = profiles.map((profile, index) => {
    const pubkey =
      typeof profile.pubkey === "string" && profile.pubkey.length > 0
        ? profile.pubkey.toLowerCase()
        : null;
    const npub =
      typeof profile.npub === "string" && profile.npub.length > 0
        ? profile.npub.toLowerCase()
        : null;
    return [pubkey ?? npub ?? `profile-${index}`, profile] as const;
  });
  return Array.from(new Map(keyedProfiles).values());
}

export function normalizeProfileFollowersResponse(value: unknown): ProfileFollowersResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];
  const followers = normalizeProfiles(
    record.followers ??
      record.profiles ??
      record.users ??
      record.items ??
      record.data ??
      fallbackItems
  );
  const total = asNumber(record.total) ?? asNumber(record.count);

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    followers: dedupeProfilesByPubkey(followers),
    total: total ?? followers.length,
  };
}

export function normalizeProfileMentionsResponse(value: unknown): ProfileMentionsResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];
  const mentions = normalizeProfiles(
    record.mentions ??
      record.mentioned_by ??
      record.profiles ??
      record.users ??
      record.items ??
      record.data ??
      fallbackItems
  );
  const total = asNumber(record.total) ?? asNumber(record.count);

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    mentions: dedupeProfilesByPubkey(mentions),
    total: total ?? mentions.length,
  };
}

export function normalizeRelatedProfilesResponse(value: unknown): RelatedProfilesResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];
  const relatedProfiles = normalizeProfiles(
    record.related_profiles ??
      record.related ??
      record.profiles ??
      record.users ??
      record.items ??
      record.data ??
      fallbackItems
  );
  const total = asNumber(record.total) ?? asNumber(record.count);

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    related_profiles: dedupeProfilesByPubkey(relatedProfiles),
    total: total ?? relatedProfiles.length,
  };
}

export function normalizeContactListContextResponse(value: unknown): ContactListContextResponse {
  const record = asRecord(value) ?? {};
  const contacts = normalizeProfiles(
    record.contacts ??
      record.follows ??
      record.following ??
      record.profiles ??
      record.items ??
      record.data
  );
  const contactPubkeys = normalizeStringArray(
    record.contact_pubkeys ?? record.contacts_pubkeys ?? record.pubkeys
  );
  const contactProfilesFromPubkeys = contactPubkeys.map(
    (pubkey) =>
      ({
        pubkey,
      }) satisfies Profile
  );
  const relays = normalizeStringArray(record.relays ?? record.relay_hints ?? record.relay_list);

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    contacts: dedupeProfilesByPubkey([...contacts, ...contactProfilesFromPubkeys]),
    contact_pubkeys: contactPubkeys.length > 0 ? contactPubkeys : undefined,
    relays: relays.length > 0 ? relays : undefined,
  };
}

function normalizeRelayListEntry(value: unknown, fallbackRelayUrl?: string): RelayListEntry | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return { relay_url: value.trim() };
  }

  const record = asRecord(value);
  if (!record) {
    if (typeof fallbackRelayUrl === "string" && fallbackRelayUrl.trim().length > 0) {
      return { relay_url: fallbackRelayUrl.trim() };
    }
    return null;
  }

  const relayUrl =
    asString(record.relay_url) ??
    asString(record.url) ??
    asString(record.relay) ??
    asString(record.host) ??
    asString(record.name) ??
    fallbackRelayUrl;
  if (!relayUrl || relayUrl.trim().length === 0) return null;

  return compactDefined({
    ...record,
    relay_url: relayUrl.trim(),
    read: asBoolean(record.read) ?? asBoolean(record.can_read),
    write: asBoolean(record.write) ?? asBoolean(record.can_write),
  });
}

function normalizeRelayListEntries(value: unknown): RelayListEntry[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeRelayListEntry(entry))
      .filter((entry): entry is RelayListEntry => entry !== null);
  }

  const record = asRecord(value);
  if (!record) return [];

  return Object.entries(record)
    .map(([relayUrl, relayMeta]) => normalizeRelayListEntry(relayMeta, relayUrl))
    .filter((entry): entry is RelayListEntry => entry !== null);
}

export function normalizeRelayListContextResponse(value: unknown): RelayListContextResponse {
  const record = asRecord(value) ?? {};
  const relays = normalizeRelayListEntries(
    record.relays ?? record.relay_list ?? record.entries ?? record.items ?? record.data
  );
  const dedupedRelays = Array.from(
    new Map(
      relays
        .filter((entry) => typeof entry.relay_url === "string" && entry.relay_url.length > 0)
        .map((entry) => [entry.relay_url!.toLowerCase(), entry] as const)
    ).values()
  );

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    relays: dedupedRelays.length > 0 ? dedupedRelays : undefined,
  };
}

export function normalizeRelayHealthResponse(value: unknown): RelayHealthResponse {
  const record = asRecord(value) ?? {};
  const candidateRelays =
    record.relays ?? record.relay_health ?? record.health ?? record.items ?? record.data;
  const relays = asArray(candidateRelays)
    .map((entry) => normalizeRelayObservation(entry))
    .filter(
      (entry): entry is { relay_url?: string; seen_at?: string | number; [key: string]: unknown } =>
        entry !== null
    )
    .map((entry) =>
      compactDefined({
        ...entry,
        status: asString(entry.status),
        healthy: asBoolean(entry.healthy),
        latency_ms: asNumber(entry.latency_ms),
        uptime: asNumber(entry.uptime) ?? asString(entry.uptime),
        last_seen_at:
          asString(entry.last_seen_at) ??
          asNumber(entry.last_seen_at) ??
          asString(entry.seen_at) ??
          asNumber(entry.seen_at),
      })
    );

  return {
    ...record,
    relays: relays.length > 0 ? relays : undefined,
  };
}

export function normalizeProfileTopicsResponse(value: unknown): ProfileTopicsResponse {
  const record = asRecord(value) ?? {};
  const context = asRecord(record.context);
  const topics = normalizeHashtagEntries(
    record.topics ?? record.hashtags ?? record.interests ?? context?.topics ?? context?.hashtags
  );
  const profiles = normalizeProfiles(
    record.profiles ??
      record.related_profiles ??
      record.interest_profiles ??
      context?.profiles ??
      context?.related_profiles
  );

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    topics: topics.length > 0 ? topics : undefined,
    profiles: dedupeProfilesByPubkey(profiles),
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
