import { LONG_FORM_KIND } from "@/lib/types/api";
import type {
  ArticleRecord,
  DomainEntry,
  EventRecord,
  HashtagEntry,
  Profile,
  ProfileStats,
} from "@/lib/types/api";
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  compactDefined,
  firstString,
  parseJsonRecord,
  parseNumericAmount,
} from "@/lib/api/normalize/helpers";
import { eventRecordSchema, profileSchema } from "@/lib/api/schemas/core";
import { softParseApiPayload } from "@/lib/api/schemas/parse";

export function normalizeEventRecord(value: unknown): EventRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  const counts = asRecord(record.counts);

  const normalized = {
    ...record,
    id:
      asString(record.id) ??
      asString(record.event_id) ??
      asString(record.eventId) ??
      asString(record.note_id) ??
      asString(record.noteId) ??
      "",
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    reply_count:
      asNumber(record.reply_count) ?? asNumber(record.replies) ?? asNumber(counts?.reply_count),
    reaction_count:
      asNumber(record.reaction_count) ??
      asNumber(record.reactions) ??
      asNumber(counts?.reaction_count),
    repost_count:
      asNumber(record.repost_count) ?? asNumber(record.reposts) ?? asNumber(counts?.repost_count),
    zap_count: asNumber(record.zap_count) ?? asNumber(record.zaps) ?? asNumber(counts?.zap_count),
    zap_msats: asNumber(record.zap_msats) ?? asNumber(counts?.zap_msats),
  } satisfies EventRecord;

  if (!normalized.id) return normalized;
  return softParseApiPayload(eventRecordSchema, normalized, "normalizeEventRecord") as EventRecord;
}

export function normalizeEventRecords(value: unknown): EventRecord[] {
  return asArray(value)
    .map((entry) => normalizeEventRecord(entry))
    .filter((entry): entry is EventRecord => entry !== null);
}

export function extractArticleTagValue(
  record: Record<string, unknown>,
  name: string
): string | undefined {
  const tags = record.tags;
  if (!Array.isArray(tags)) return undefined;
  for (const tag of tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    if (String(tag[0]).toLowerCase() !== name.toLowerCase()) continue;
    const candidate = asString(tag[1]);
    if (candidate) return candidate;
  }
  return undefined;
}

export function normalizeArticleRecord(value: unknown): ArticleRecord | null {
  const base = normalizeEventRecord(value);
  if (!base) return null;
  const record = asRecord(value) ?? {};
  const author = normalizeProfile(record.author);
  const publishedAtRaw =
    asNumber(record.published_at) ??
    parseNumericAmount(extractArticleTagValue(record, "published_at"));

  return compactDefined({
    ...base,
    kind: asNumber(base.kind) ?? LONG_FORM_KIND,
    title: asString(record.title) ?? extractArticleTagValue(record, "title"),
    summary:
      asString(record.summary) ??
      asString(record.description) ??
      extractArticleTagValue(record, "summary"),
    image: asString(record.image) ?? extractArticleTagValue(record, "image"),
    language: asString(record.language) ?? extractArticleTagValue(record, "language"),
    published_at: publishedAtRaw,
    score: asNumber(record.score),
    author: author ?? undefined,
  }) as ArticleRecord;
}

export function normalizeArticleRecords(value: unknown): ArticleRecord[] {
  return asArray(value)
    .map((entry) => normalizeArticleRecord(entry))
    .filter((entry): entry is ArticleRecord => entry !== null && entry.id.length > 0);
}

export const AUTHORED_NOTE_EXCLUDED_KINDS = new Set([0, 6, 7, 9734, 9735]);

export function eventTagMarker(tag: unknown): string {
  if (!Array.isArray(tag) || tag.length < 4) return "";
  return typeof tag[3] === "string" ? tag[3].toLowerCase() : "";
}

export function isAuthoredReplyEvent(event: EventRecord): boolean {
  const tags = event.tags;
  if (!Array.isArray(tags)) return false;
  return tags.some(
    (tag) => Array.isArray(tag) && tag[0] === "e" && eventTagMarker(tag) === "reply"
  );
}

export function filterAuthoredNotes(events: EventRecord[]): EventRecord[] {
  return events.filter((event) => {
    if (typeof event.kind === "number" && AUTHORED_NOTE_EXCLUDED_KINDS.has(event.kind)) {
      return false;
    }
    if (isAuthoredReplyEvent(event)) return false;
    return true;
  });
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
        asProfileRecord.authorPubkey,
        asProfileRecord.profile_pubkey,
        asProfileRecord.profilePubkey,
        asProfileRecord.user_pubkey,
        asProfileRecord.userPubkey
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

  if (!normalized.pubkey) return normalized as Profile;
  return softParseApiPayload(profileSchema, normalized, "normalizeProfile") as Profile;
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

export function normalizeDomainLabel(value: unknown): string | undefined {
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
