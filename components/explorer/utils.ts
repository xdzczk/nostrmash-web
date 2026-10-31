import type { DomainEntry, EventRecord, Profile } from "@/lib/types/api";
import { extractHashtagsFromText, extractLinkableUrls } from "@/lib/notes/text";
import { hexToNpub } from "../../lib/nostr/npub";

const LABEL_ALIASES: Record<string, string> = {
  created_at: "Created",
  updated_at: "Updated",
  event_count: "Events",
  note_count: "Notes",
  notes_count: "Notes",
  profile_count: "Profiles",
  profiles_count: "Profiles",
  relay_count: "Relays",
  relay_url: "Relay",
  unique_authors: "Authors",
  unique_authors_24h: "Authors on relays (24h)",
  unique_authors_7d: "Authors on relays (7d)",
  unique_relays: "Unique relays",
  unique_notes: "Unique notes",
  unique_profiles: "Unique profiles",
  // "Relays indexed", not "active relays": the figure counts relays this
  // index reads from, not relays alive on the network (which is far larger).
  active_relays: "Relays indexed",
  active_authors: "Note authors",
  active_authors_24h: "Note authors (24h)",
  active_authors_7d: "Note authors (7d)",
  active_authors_30d: "Note authors (30d)",
  note_volume_24h: "Note volume (24h)",
  note_volume_7d: "Note volume (7d)",
  note_volume_30d: "Note volume (30d)",
  active_24h: "Relays indexed (24h)",
  active_7d: "Relays indexed (7d)",
  relays_active_24h: "Relays indexed (24h)",
  relays_active_7d: "Relays indexed (7d)",
  network_relays_active_24h: "Relays indexed (24h)",
  network_relays_active_7d: "Relays indexed (7d)",
  event_volume_24h: "Relay event volume (24h)",
  event_volume_7d: "Relay event volume (7d)",
  relays_event_volume_24h: "Relay event volume (24h)",
  relays_event_volume_7d: "Relay event volume (7d)",
  events_ingested: "Events ingested",
  projected_profiles: "Projected profiles",
  active_profiles: "Active profiles",
  active_notes: "Active notes",
  top_relay_count: "Top relay count",
  top_hashtag_count: "Top hashtag count",
  total_notes: "Total notes",
  total_profiles: "Total profiles",
  total_relays: "Total relays",
  total_hashtags: "Total hashtags",
  consistency: "Consistency",
  score: "Score",
  rank: "Rank",
  recent_new_followers: "New followers",
  recent_engagement_received: "Engagement",
  recent_post_count: "Posts",
  recent_reply_count: "Replies",
  recent_active_days: "Active days",
  recent_activity_at: "Recent activity",
  likes: "Likes",
  replies: "Replies",
  reply_count: "Replies",
  boosts: "Boosts",
  reposts: "Reposts",
  repost_count: "Reposts",
  reactions: "Reactions",
  reaction_count: "Reactions",
  zaps: "Zaps",
  zap_count: "Zaps",
  followers_count: "Followers",
  following_count: "Following",
  relay_mentions: "Relay mentions",
  mention_count: "Mentions",
  mentions_count: "Mentions",
};

/** Relay-row `unique_authors` counts authors seen on that relay, any event kind. */
export function formatRelayMetricLabel(label: string): string {
  if (label === "unique_authors") return "Authors";
  return formatMetricLabel(label);
}

export const ENGAGEMENT_STAT_KEYS = [
  "reply_count",
  "repost_count",
  "reaction_count",
  "zap_count",
] as const;

export type EngagementStatKey = (typeof ENGAGEMENT_STAT_KEYS)[number];

export type EngagementStat = {
  label: EngagementStatKey;
  value: number;
  detail?: string;
  /** Quote posts added into a repost total. Omitted when none were added. */
  quoteCount?: number;
};

const ENGAGEMENT_ALIASES: Record<EngagementStatKey, readonly string[]> = {
  reply_count: ["reply_count", "replies"],
  repost_count: ["repost_count", "reposts", "boosts"],
  reaction_count: ["reaction_count", "reactions", "likes"],
  zap_count: ["zap_count", "zaps"],
};

const ZAP_MSATS_ALIASES = ["zap_msats", "msats", "amount_msats"] as const;

/** Quote posts stored apart from kind 6 / kind 16 reposts. */
const QUOTE_COUNT_ALIASES = ["quote_count", "quotes", "quote_reposts"] as const;

function readFiniteNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.replace(/[,_\s]/g, ""));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }
  return null;
}

function readEngagementValue(source: unknown, keys: readonly string[]): number | null {
  if (!isRecord(source)) return null;
  for (const key of keys) {
    const direct = readFiniteNonNegativeNumber(source[key]);
    if (direct !== null) return direct;
  }
  for (const nestedKey of ["counts", "summary"] as const) {
    const nested = isRecord(source[nestedKey]) ? source[nestedKey] : null;
    if (!nested) continue;
    for (const key of keys) {
      const value = readFiniteNonNegativeNumber(nested[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

export function formatSatsFromMsats(msats: number): string | null {
  if (!Number.isFinite(msats) || msats <= 0) return null;
  if (msats >= 1000) {
    const sats = msats / 1000;
    return Number.isInteger(sats)
      ? `${sats.toLocaleString()} sats`
      : `${sats.toLocaleString(undefined, { maximumFractionDigits: 1 })} sats`;
  }
  return `${msats.toLocaleString()} msats`;
}

export function extractZapMsats(...sources: unknown[]): number {
  for (const source of sources) {
    const value = readEngagementValue(source, ZAP_MSATS_ALIASES);
    if (value !== null) return value;
  }
  return 0;
}

function readFirstEngagement(sources: unknown[], keys: readonly string[]): number | null {
  for (const source of sources) {
    const value = readEngagementValue(source, keys);
    if (value !== null) return value;
  }
  return null;
}

/** Always returns replies/reposts/reactions/zaps, defaulting missing values to 0. */
export function extractEngagementStats(...sources: unknown[]): EngagementStat[] {
  const zapMsats = extractZapMsats(...sources);
  const zapDetail = formatSatsFromMsats(zapMsats) ?? undefined;
  return ENGAGEMENT_STAT_KEYS.map((key) => {
    return {
      label: key,
      value: readFirstEngagement(sources, ENGAGEMENT_ALIASES[key]) ?? 0,
      ...(key === "zap_count" && zapDetail ? { detail: zapDetail } : {}),
    };
  });
}

/**
 * Quote posts that are counted separately from reposts.
 * This is not the note-page linkage split, where `quote_count` is the subset of
 * reposts that carry text and is already inside the full `repost_count`.
 */
export function readQuoteCount(...sources: unknown[]): number {
  return readFirstEngagement(sources, QUOTE_COUNT_ALIASES) ?? 0;
}

/**
 * The four post stats. Quote posts are added to the repost total when
 * `quote_count` is present and is not already part of `repost_count`.
 */
export function postEngagementStats(...sources: unknown[]): EngagementStat[] {
  const stats = extractEngagementStats(...sources);
  const quotes = readQuoteCount(...sources);
  if (quotes <= 0) return stats;
  return stats.map((stat) =>
    stat.label === "repost_count"
      ? { ...stat, value: stat.value + quotes, quoteCount: quotes }
      : stat
  );
}

export function applyEngagementStats<T extends Record<string, unknown>>(
  note: T,
  ...extraSources: unknown[]
): T & Record<EngagementStatKey, number> & { zap_msats: number; quote_count?: number } {
  const stats = extractEngagementStats(note, ...extraSources);
  const values = Object.fromEntries(stats.map((stat) => [stat.label, stat.value])) as Record<
    EngagementStatKey,
    number
  >;
  const quoteCount = readQuoteCount(note, ...extraSources);
  return {
    ...note,
    ...values,
    zap_msats: extractZapMsats(note, ...extraSources),
    ...(quoteCount > 0 ? { quote_count: quoteCount } : {}),
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function formatMetricLabel(value: string): string {
  if (!value) return "Metric";
  const normalized = value.trim().toLowerCase();
  const aliased = LABEL_ALIASES[normalized];
  if (aliased) return aliased;

  const words = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return "Metric";

  return words
    .map((word) => {
      const upper = word.toUpperCase();
      if (upper === "NPUB" || upper === "NIP05" || upper === "URL") return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

const ELLIPSIS = "…";

/** `:shortcode:` tokens are not emoji. Drop them so a name stays readable. */
export function stripEmojiShortcodes(value: string): string {
  return value
    .replace(/:[a-z0-9_+-]{2,}:/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Keep the NIP-05 domain intact. A long local-part shrinks from the end
 * (`mrsaturday@shitposter.mostr.pub` → `mrsaturd…@shitposter.mostr.pub`)
 * instead of cutting through the middle of the address.
 */
export function truncateNip05(value: string, maxLength = 32): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return truncateProfileLabel(trimmed, maxLength);
  const domain = trimmed.slice(at);
  const local = trimmed.slice(0, at);
  // Bridged handles (`name_at_instance@relay`) chop into noise. The name is
  // already on the row, so the secondary line keeps the domain.
  if (local.includes("_at_")) {
    return domain.length <= maxLength ? domain : truncateProfileLabel(domain, maxLength);
  }
  const room = maxLength - domain.length - ELLIPSIS.length;
  if (room < 1) {
    return domain.length <= maxLength ? domain : truncateProfileLabel(domain, maxLength);
  }
  return `${[...local].slice(0, room).join("")}${ELLIPSIS}${domain}`;
}

/** Secondary identity for a row: NIP-05 keeps its domain; everything else end-truncates. */
export function formatProfileSecondary(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return truncateNip05(trimmed);
  return truncateProfileLabel(trimmed);
}

export function truncateMiddle(value: string, maxLength = 36): string {
  if (value.length <= maxLength) return value;
  const room = Math.max(0, maxLength - ELLIPSIS.length);
  const head = Math.max(10, Math.floor(room / 2));
  const tail = Math.max(8, room - head);
  return `${value.slice(0, head)}${ELLIPSIS}${value.slice(-tail)}`;
}

export type IdentifierKind =
  "npub" | "pubkey" | "note" | "event" | "relay" | "domain" | "path" | "url";

export type IdentifierSurface = "primary" | "secondary" | "detail";

const IDENTIFIER_POLICY: Record<IdentifierSurface, Record<IdentifierKind, number>> = {
  primary: {
    npub: 18,
    pubkey: 18,
    note: 18,
    event: 18,
    relay: 28,
    domain: 28,
    path: 30,
    url: 30,
  },
  secondary: {
    npub: 26,
    pubkey: 26,
    note: 26,
    event: 26,
    relay: 34,
    domain: 34,
    path: 36,
    url: 36,
  },
  detail: {
    npub: 42,
    pubkey: 42,
    note: 42,
    event: 42,
    relay: 44,
    domain: 44,
    path: 52,
    url: 52,
  },
};

function truncateByPolicy(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const room = Math.max(0, maxLength - ELLIPSIS.length);
  if (room <= 0) return ELLIPSIS;
  const head = Math.max(4, Math.ceil(room * 0.58));
  const tail = Math.max(4, room - head);
  return `${trimmed.slice(0, head)}${ELLIPSIS}${trimmed.slice(-tail)}`;
}

export function truncateIdentifier(
  value: string,
  kind: IdentifierKind,
  surface: IdentifierSurface = "primary"
): string {
  const limit = IDENTIFIER_POLICY[surface][kind];
  return truncateByPolicy(value, limit);
}

/** Compact list/card cap for display names. Longer names keep the start and ellipsis. */
export const PROFILE_LABEL_COMPACT_LIMIT = 36;

/** End-truncate a profile display name using code points so emoji stays intact. */
export function truncateProfileLabel(
  value: string,
  maxLength = PROFILE_LABEL_COMPACT_LIMIT
): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const units = [...trimmed];
  if (units.length <= maxLength) return trimmed;
  const room = Math.max(1, maxLength - ELLIPSIS.length);
  return `${units.slice(0, room).join("")}${ELLIPSIS}`;
}

/**
 * Headline count for a trending domain. Newer payloads report `link_count`
 * (links in the window); older ones used `count`/`event_count`.
 */
export function domainHeadlineCount(entry: DomainEntry): number | undefined {
  const candidates = [entry.link_count, entry.count, entry.event_count, entry.note_count];
  return candidates.find(
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0
  );
}

export function normalizeDomainLabel(value: string): string {
  const normalized = normalizeDomainForRoute(value);
  return (
    normalized ??
    value
      .trim()
      .toLowerCase()
      .replace(/^www\./, "")
  );
}

function compactPathForDisplay(pathname: string, maxLength: number): string {
  const cleanedPath = pathname.replace(/\/{2,}/g, "/");
  if (cleanedPath === "/") return "";
  return truncateIdentifier(cleanedPath, "path", maxLength <= 34 ? "primary" : "secondary");
}

export function formatUrlForDisplay(value: string, surface: IdentifierSurface = "primary"): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    const parsed = new URL(trimmed);
    const host = normalizeDomainLabel(parsed.hostname);
    const path = compactPathForDisplay(parsed.pathname, IDENTIFIER_POLICY[surface].url);
    const hasQuery = parsed.search.length > 0 || parsed.hash.length > 0;
    const suffix = hasQuery ? "?" : "";
    const candidate = `${host}${path}${suffix}`;
    return truncateIdentifier(candidate, "url", surface);
  } catch {
    return truncateIdentifier(trimmed, "url", surface);
  }
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) return parsed.toLocaleString();
    }
    return trimmed.length > 0 ? value : "—";
  }
  if (Array.isArray(value)) return `${value.length} items`;
  if (isRecord(value)) return `${Object.keys(value).length} fields`;
  return String(value);
}

/** Compact number for dense UI (33.1M, 615K). Falls back to locale string. */
export function formatCompactNumber(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return formatValue(value);
  }
  try {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return value.toLocaleString();
  }
}

function getProfileCandidateRecords(profile: Profile): Record<string, unknown>[] {
  const root = profile as Record<string, unknown>;
  const nestedProfile = isRecord(root.profile) ? root.profile : null;
  const metadata =
    (isRecord(root.metadata) ? root.metadata : null) ??
    parseJsonRecord(root.metadata) ??
    (nestedProfile && isRecord(nestedProfile.metadata) ? nestedProfile.metadata : null) ??
    (nestedProfile ? parseJsonRecord(nestedProfile.metadata) : null);
  const content =
    (isRecord(root.content) ? root.content : null) ??
    parseJsonRecord(root.content) ??
    (nestedProfile && isRecord(nestedProfile.content) ? nestedProfile.content : null) ??
    (nestedProfile ? parseJsonRecord(nestedProfile.content) : null);

  return [root, nestedProfile, metadata, content].filter(
    (entry): entry is Record<string, unknown> => Boolean(entry)
  );
}

function readProfileText(profile: Profile, keys: string[]): string | undefined {
  const records = getProfileCandidateRecords(profile);
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return undefined;
}

export function normalizeImageSrc(value: string | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value) || /^blob:/i.test(value)) {
    return value;
  }
  if (value.startsWith("//")) {
    return `https:${value}`;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(value)) {
    return `https://${value}`;
  }
  return null;
}

/**
 * Matches next.config images.remotePatterns: https anywhere, http only on localhost.
 * Passing other http hosts into next/image throws and replaces the route with error.tsx.
 */
export function isNextImageCompatibleSrc(src: string): boolean {
  if (/^data:image\//i.test(src) || /^blob:/i.test(src)) return true;
  try {
    const parsed = new URL(src);
    if (parsed.protocol === "https:") return true;
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Allow only http(s) absolute URLs (or same-origin relative paths starting with `/`).
 * Rejects javascript:, data:, and other dangerous schemes used in UGC link fields.
 */
export function sanitizeExternalHref(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function profileFallbackAvatarDataUrl(profile: Profile): string {
  const seed = profileIdentifier(profile);
  const label = escapeSvgText(profileInitial(profile));
  const hash = hashString(seed);
  const hueA = hash % 360;
  const hueB = (hash >>> 8) % 360;
  const gradient = `hsl(${hueA} 78% 42%)`;
  const gradientEnd = `hsl(${hueB} 72% 28%)`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='88' height='88' viewBox='0 0 88 88'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='${gradient}'/><stop offset='100%' stop-color='${gradientEnd}'/></linearGradient></defs><rect width='88' height='88' rx='44' fill='url(#g)'/><text x='50%' y='54%' text-anchor='middle' dominant-baseline='middle' font-family='Inter, system-ui, sans-serif' font-size='34' font-weight='700' fill='rgba(255,255,255,0.94)'>${label}</text></svg>`;
  try {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    // Defensive: never let avatar generation throw into a route error boundary.
    const safeSvg = svg.replace(label, "?");
    return `data:image/svg+xml;utf8,${encodeURIComponent(safeSvg)}`;
  }
}

export function profilePictureUrl(profile: Profile): string | null {
  const raw = readProfileText(profile, [
    "picture",
    "image",
    "avatar",
    "avatar_url",
    "avatarUrl",
    "pfp",
    "picture_url",
    "pictureUrl",
    "profile_image",
    "profile_picture",
  ]);
  const normalized = normalizeImageSrc(raw);
  if (!normalized || !isNextImageCompatibleSrc(normalized)) return null;
  return normalized;
}

export function readableProfileName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (
    normalized.length === 0 ||
    normalized.length > 80 ||
    /[\u0000-\u001f\u007f-\u009f\ufffd]/u.test(normalized) ||
    /%(?:[0-9a-f]{2})/i.test(normalized) ||
    /^(?:nostr:|https?:\/\/|[\[{])/i.test(normalized) ||
    /^[0-9a-f]{40,}$/i.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

/** Local part of a NIP-05, when it can stand in as a name. Root `_@` and bridged handles do not. */
function nip05LocalPart(profile: Profile): string | undefined {
  const nip05 = readProfileText(profile, ["nip05", "nip_05"]);
  if (!nip05 || nip05.length > 128 || /\s|[\u0000-\u001f\u007f-\u009f\ufffd]/u.test(nip05)) {
    return undefined;
  }
  const at = nip05.lastIndexOf("@");
  if (at <= 0) return undefined;
  const local = nip05.slice(0, at);
  if (local === "_" || local.includes("_at_")) return undefined;
  return readableProfileName(local);
}

export function profileLabel(profile: Profile): string {
  const displayName = readableProfileName(
    readProfileText(profile, ["display_name", "displayName", "display", "displayname"])
  );
  const name = readableProfileName(
    readProfileText(profile, ["name", "username", "user_name", "handle"])
  );
  const npub = readProfileText(profile, ["npub", "npub_hex", "npubHex"]);
  const pubkey = readProfileText(profile, [
    "pubkey",
    "author_pubkey",
    "authorPubkey",
    "profile_pubkey",
    "profilePubkey",
    "user_pubkey",
    "userPubkey",
  ]);

  const npubFromPubkey = pubkey ? hexToNpub(pubkey) : null;
  const fallbackNpub = npub ?? npubFromPubkey;

  const cleanedDisplay = displayName ? stripEmojiShortcodes(displayName) : "";
  const cleanedName = name ? stripEmojiShortcodes(name) : "";
  const nip05Local = nip05LocalPart(profile);

  return (
    (cleanedDisplay.length > 0 ? cleanedDisplay : undefined) ??
    (cleanedName.length > 0 ? cleanedName : undefined) ??
    (nip05Local ? truncateProfileLabel(nip05Local) : undefined) ??
    (fallbackNpub ? truncateIdentifier(fallbackNpub, "npub", "primary") : undefined) ??
    (pubkey ? truncateIdentifier(pubkey, "pubkey", "primary") : undefined) ??
    "Profile"
  );
}

export function lookupProfileByPubkey(
  pubkey: string,
  profiles?: Record<string, Profile | undefined>
): Profile | undefined {
  if (!profiles || !pubkey) return undefined;
  const direct = profiles[pubkey] ?? profiles[pubkey.toLowerCase()];
  if (direct) return direct;
  const needle = pubkey.toLowerCase();
  for (const [key, profile] of Object.entries(profiles)) {
    if (key.toLowerCase() === needle) return profile;
  }
  return undefined;
}

function profileHandleCandidates(profile: Profile): string[] {
  const values = [
    readProfileText(profile, ["display_name", "displayName", "display", "displayname"]),
    readProfileText(profile, ["name", "username", "user_name", "handle"]),
    readProfileText(profile, ["nip05", "nip_05"]),
  ];
  const handles: string[] = [];
  for (const value of values) {
    const readable = readableProfileName(value);
    if (!readable) continue;
    handles.push(readable);
    const at = readable.indexOf("@");
    if (at > 0) handles.push(readable.slice(0, at));
  }
  return handles;
}

/** Best-effort `@handle` match against already-hydrated profiles. Ambiguous names do not match. */
export function lookupProfileByHandle(
  handle: string,
  profiles?: Record<string, Profile | undefined>
): Profile | undefined {
  if (!profiles || !handle) return undefined;
  const needle = handle.replace(/^@/, "").trim().toLowerCase();
  if (!needle) return undefined;

  const matches: Profile[] = [];
  const seen = new Set<string>();
  for (const profile of Object.values(profiles)) {
    if (!profile) continue;
    const key =
      typeof profile.pubkey === "string" && profile.pubkey.length > 0
        ? profile.pubkey.toLowerCase()
        : "";
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    const candidates = profileHandleCandidates(profile).map((candidate) => candidate.toLowerCase());
    if (candidates.includes(needle)) matches.push(profile);
  }
  return matches.length === 1 ? matches[0] : undefined;
}

/** `@name` when a readable profile name exists; otherwise a truncated npub. */
export function formatMentionLabel(
  pubkey: string,
  profiles?: Record<string, Profile | undefined>
): string {
  const profile = lookupProfileByPubkey(pubkey, profiles);
  const display = readableProfileName(
    (typeof profile?.display_name === "string" && profile.display_name) ||
      (typeof profile?.name === "string" && profile.name) ||
      undefined
  );
  if (display) return `@${display}`;
  const npub = hexToNpub(pubkey);
  return npub
    ? `@${truncateIdentifier(npub, "npub", "primary")}`
    : `@${truncateIdentifier(pubkey, "pubkey", "primary")}`;
}

export function formatNaddrLabel(
  token: { value: string; pubkey: string },
  profiles?: Record<string, Profile | undefined>
): string {
  const profile = lookupProfileByPubkey(token.pubkey, profiles);
  const display = readableProfileName(
    (typeof profile?.display_name === "string" && profile.display_name) ||
      (typeof profile?.name === "string" && profile.name) ||
      undefined
  );
  if (display) return `@${display}'s article`;
  const raw = token.value.replace(/^nostr:/i, "");
  return truncateIdentifier(raw, "note", "primary");
}

export function profileIdentifier(profile: Profile): string {
  const npub = readProfileText(profile, ["npub", "npub_hex", "npubHex"]) ?? "";
  const pubkey =
    readProfileText(profile, [
      "pubkey",
      "author_pubkey",
      "authorPubkey",
      "profile_pubkey",
      "profilePubkey",
      "user_pubkey",
      "userPubkey",
    ]) ?? "";
  // Prefer hex so profile/summary/related routes hit canonical API keys even
  // when an older API build does not accept npub path params.
  if (pubkey) return pubkey;
  if (npub) return npub;
  return "unknown";
}

/** App route for a profile identity, or undefined when no usable identifier exists. */
export function profileHref(
  profile?: Profile | null,
  pubkeyFallback?: string | null
): string | undefined {
  if (profile) {
    const identifier = profileIdentifier(profile);
    if (identifier !== "unknown") {
      return `/profiles/${encodeURIComponent(identifier)}`;
    }
  }
  const fallback = typeof pubkeyFallback === "string" ? pubkeyFallback.trim() : "";
  if (fallback.length > 0) {
    return `/profiles/${encodeURIComponent(fallback)}`;
  }
  return undefined;
}

export function profileSecondaryLabel(profile: Profile): string | null {
  const displayName = readableProfileName(
    readProfileText(profile, ["display_name", "displayName", "display", "displayname"])
  );
  const name = readableProfileName(
    readProfileText(profile, ["name", "username", "user_name", "handle"])
  );
  const nip05Candidate = readProfileText(profile, ["nip05", "nip_05"]);
  const nip05 =
    nip05Candidate &&
    nip05Candidate.length <= 128 &&
    !/\s|[\u0000-\u001f\u007f-\u009f\ufffd]/u.test(nip05Candidate)
      ? nip05Candidate
      : null;
  if (displayName && name && stripEmojiShortcodes(displayName) !== stripEmojiShortcodes(name)) {
    const handle = stripEmojiShortcodes(name);
    if (handle.length > 0) return handle;
  }
  if (nip05) {
    // NIP-05 root identifiers (`_@domain`) are conventionally shown as the bare domain.
    return nip05.startsWith("_@") ? nip05.slice(2) : nip05;
  }
  // A name with no NIP-05 does not get a hex pubkey on the line underneath.
  return null;
}

/** One readable line of a bio: identifiers, invoices, and shortcodes removed. */
export function profileAboutLine(about: string): string {
  return stripEmojiShortcodes(
    about
      .replace(/nostr:(?:npub|note|nevent|nprofile|naddr|nrelay)1[a-z0-9]+/gi, " ")
      .replace(/\b(?:npub|note|nevent|nprofile|naddr|nrelay)1[a-z0-9]{8,}\b/gi, " ")
      .replace(/\b[0-9a-f]{64}\b/gi, " ")
      .replace(/\b(?:lnbc|lnurl)[a-z0-9]{20,}\b/gi, " ")
      .replace(/lightning:[^\s]+/gi, " ")
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, " ")
  );
}

export function profileInitial(profile: Profile): string {
  const label = profileLabel(profile).trim();
  // Code-point aware: String#slice(0, 1) can split a surrogate pair and make
  // encodeURIComponent throw URIError when building the fallback avatar data URL.
  const first = [...label][0];
  if (!first || /[\uD800-\uDFFF]/.test(first)) return "?";
  try {
    const upper = first.toLocaleUpperCase();
    encodeURIComponent(upper);
    return upper;
  } catch {
    return "?";
  }
}

export function noteAuthorIdentifier(note: EventRecord): string {
  if (typeof note.pubkey === "string" && note.pubkey.length > 0) {
    const npub = hexToNpub(note.pubkey);
    if (npub) return truncateIdentifier(npub, "npub", "primary");
    return truncateIdentifier(note.pubkey, "pubkey", "primary");
  }
  return "Author";
}

/** Seeded gradient avatar for a pubkey when no Profile object is available. */
export function pubkeyFallbackAvatarDataUrl(pubkey: string): string {
  return profileFallbackAvatarDataUrl({ pubkey });
}

export function noteInlineAuthorProfile(note: EventRecord): Profile | undefined {
  const root = note as Record<string, unknown>;
  const rawAuthor = isRecord(root.author) ? root.author : null;
  const rawProfile =
    (rawAuthor && isRecord(rawAuthor.profile) ? rawAuthor.profile : null) ??
    (isRecord(root.profile) ? root.profile : null);
  const candidate = rawProfile ?? rawAuthor;
  if (!candidate) return undefined;
  if (
    typeof candidate.pubkey !== "string" &&
    typeof note.pubkey === "string" &&
    note.pubkey.trim().length > 0
  ) {
    return { ...candidate, pubkey: note.pubkey } as Profile;
  }
  return candidate as Profile;
}

export function normalizeDomainForRoute(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return null;
  const withoutPunctuation = trimmed.replace(/[),.;!?]+$/g, "");
  const candidate = withoutPunctuation.includes("://")
    ? withoutPunctuation
    : `https://${withoutPunctuation}`;
  try {
    const hostname = new URL(candidate).hostname.toLowerCase().replace(/\.$/, "");
    return hostname.length > 0 ? hostname : null;
  } catch {
    const fallbackHost = withoutPunctuation
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    const fallback = (fallbackHost ?? "").replace(/\.$/, "");
    return fallback.length > 0 ? fallback : null;
  }
}

function extractUrlDomainsFromText(content: string): string[] {
  const domains = extractLinkableUrls(content)
    .map((url) => normalizeDomainForRoute(url))
    .filter((domain): domain is string => typeof domain === "string");
  return Array.from(new Set(domains));
}

function extractTagDomains(note: EventRecord): string[] {
  if (!Array.isArray(note.tags)) return [];
  const domains: string[] = [];
  for (const tag of note.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    const [tagName, tagValue] = tag;
    if ((tagName === "r" || tagName === "u") && typeof tagValue === "string") {
      const domain = normalizeDomainForRoute(tagValue);
      if (domain) domains.push(domain);
    }
  }
  return Array.from(new Set(domains));
}

export function extractDomainsFromNote(note: EventRecord, limit = 4): string[] {
  const fromTags = extractTagDomains(note);
  const fromContent =
    typeof note.content === "string" && note.content.length > 0
      ? extractUrlDomainsFromText(note.content)
      : [];
  return Array.from(new Set([...fromTags, ...fromContent])).slice(0, limit);
}

function extractHashtagTagValues(note: EventRecord): string[] {
  if (!Array.isArray(note.tags)) return [];
  const hashtags: string[] = [];
  for (const tag of note.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    const [tagName, tagValue] = tag;
    if (tagName !== "t" || typeof tagValue !== "string") continue;
    const normalized = tagValue.trim().replace(/^#/, "").toLowerCase();
    if (normalized.length > 0) hashtags.push(normalized);
  }
  return Array.from(new Set(hashtags));
}

function extractHashtagTextValues(note: EventRecord): string[] {
  if (typeof note.content !== "string" || note.content.length === 0) return [];
  return extractHashtagsFromText(note.content);
}

export function extractHashtagsFromNote(note: EventRecord, limit = 4): string[] {
  return Array.from(
    new Set([...extractHashtagTagValues(note), ...extractHashtagTextValues(note)])
  ).slice(0, limit);
}

function normalizeRelayRouteHost(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const withScheme =
    trimmed.includes("://") || /^[a-z][a-z0-9+\-.]*:/i.test(trimmed) ? trimmed : `wss://${trimmed}`;
  try {
    return new URL(withScheme).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    const fallback =
      trimmed
        .replace(/^wss?:\/\//i, "")
        .replace(/^https?:\/\//i, "")
        .replace(/^ws:/i, "")
        .replace(/^wss:/i, "")
        .replace(/^\/\//, "")
        .split("/")[0]
        ?.toLowerCase()
        .replace(/\.$/, "") ?? "";
    return fallback.length > 0 ? fallback : null;
  }
}

export function extractRelayHostsFromNote(note: EventRecord, limit = 3): string[] {
  if (!Array.isArray(note.tags)) return [];
  const hosts: string[] = [];
  for (const tag of note.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    const [tagName, tagValue] = tag;
    if (typeof tagValue !== "string") continue;
    const normalizedTag = typeof tagName === "string" ? tagName.toLowerCase() : "";
    const looksRelayTag =
      normalizedTag === "relay" ||
      normalizedTag === "relays" ||
      normalizedTag === "seen_on" ||
      (normalizedTag === "r" && /^wss?:\/\//i.test(tagValue.trim()));
    if (!looksRelayTag) continue;
    const host = normalizeRelayRouteHost(tagValue);
    if (host) hosts.push(host);
  }
  return Array.from(new Set(hosts)).slice(0, limit);
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

export function buildMetadataEntries(
  record: Record<string, unknown>,
  keys: string[]
): Array<{ label: string; value: unknown }> {
  return keys
    .filter((key) => record[key] !== undefined && record[key] !== null && record[key] !== "")
    .map((key) => ({ label: key, value: record[key] }));
}

export function extractPrimitiveStats(
  value: unknown,
  exclude: string[] = []
): Array<{ label: string; value: string | number | boolean }> {
  if (!isRecord(value)) return [];
  const excluded = new Set(exclude);
  const stats: Array<{ label: string; value: string | number | boolean }> = [];

  for (const [key, fieldValue] of Object.entries(value)) {
    if (excluded.has(key)) continue;
    if (
      typeof fieldValue === "string" ||
      typeof fieldValue === "number" ||
      typeof fieldValue === "boolean"
    ) {
      stats.push({ label: key, value: fieldValue });
    }
  }

  return stats;
}
