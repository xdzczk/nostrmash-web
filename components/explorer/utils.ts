import type { EventRecord, Profile } from "@/lib/types/api";
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
  unique_authors: "Unique authors",
  unique_relays: "Unique relays",
  unique_notes: "Unique notes",
  unique_profiles: "Unique profiles",
  active_relays: "Active relays",
  active_authors: "Active authors",
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
  likes: "Likes",
  replies: "Replies",
  boosts: "Boosts",
  zaps: "Zaps",
  followers_count: "Followers",
  following_count: "Following",
  relay_mentions: "Relay mentions",
  mention_count: "Mentions",
  mentions_count: "Mentions",
};

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
  if (!value) return "Unknown";
  const normalized = value.trim().toLowerCase();
  const aliased = LABEL_ALIASES[normalized];
  if (aliased) return aliased;

  const words = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return "Unknown";

  return words
    .map((word) => {
      const upper = word.toUpperCase();
      if (upper === "NPUB" || upper === "NIP05" || upper === "URL") return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function truncateMiddle(value: string, maxLength = 36): string {
  if (value.length <= maxLength) return value;
  const head = Math.max(10, Math.floor((maxLength - 3) / 2));
  const tail = Math.max(8, maxLength - head - 3);
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "n/a";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : "n/a";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value.length > 0 ? value : "n/a";
  if (Array.isArray(value)) return `${value.length} items`;
  if (isRecord(value)) return `${Object.keys(value).length} fields`;
  return String(value);
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

function normalizeImageSrc(value: string | undefined): string | null {
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

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
}

export function profileFallbackAvatarDataUrl(profile: Profile): string {
  const seed = profileIdentifier(profile);
  const label = profileInitial(profile);
  const hash = hashString(seed);
  const hueA = hash % 360;
  const hueB = (hash >>> 8) % 360;
  const gradient = `hsl(${hueA} 78% 42%)`;
  const gradientEnd = `hsl(${hueB} 72% 28%)`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='88' height='88' viewBox='0 0 88 88'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='${gradient}'/><stop offset='100%' stop-color='${gradientEnd}'/></linearGradient></defs><rect width='88' height='88' rx='44' fill='url(#g)'/><text x='50%' y='54%' text-anchor='middle' dominant-baseline='middle' font-family='Inter, system-ui, sans-serif' font-size='34' font-weight='700' fill='rgba(255,255,255,0.94)'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
  return normalizeImageSrc(raw);
}

export function profileLabel(profile: Profile): string {
  const displayName = readProfileText(profile, [
    "display_name",
    "displayName",
    "display",
    "displayname",
  ]);
  const name = readProfileText(profile, ["name", "username", "user_name", "handle"]);
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

  const isHexLike = (value: string | undefined): boolean =>
    typeof value === "string" && /^[0-9a-f]{40,}$/i.test(value);
  const npubFromPubkey = pubkey ? hexToNpub(pubkey) : null;

  return (
    (displayName && !isHexLike(displayName) ? displayName : undefined) ??
    (name && !isHexLike(name) ? name : undefined) ??
    npub ??
    npubFromPubkey ??
    truncateMiddle(pubkey ?? "unknown")
  );
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
  const encoded = !npub && pubkey ? hexToNpub(pubkey) : null;
  return npub || encoded || pubkey || "unknown";
}

export function profileSecondaryLabel(profile: Profile): string | null {
  const displayName = readProfileText(profile, [
    "display_name",
    "displayName",
    "display",
    "displayname",
  ]);
  const name = readProfileText(profile, ["name", "username", "user_name", "handle"]);
  const nip05 = readProfileText(profile, ["nip05", "nip_05"]) ?? null;
  const identifier = profileIdentifier(profile);

  if (displayName && name && displayName !== name) {
    return name;
  }
  if (nip05) {
    return nip05;
  }
  return identifier !== "unknown" ? truncateMiddle(identifier) : null;
}

export function profileInitial(profile: Profile): string {
  const label = profileLabel(profile).trim();
  return label.slice(0, 1).toUpperCase() || "?";
}

export function noteAuthorIdentifier(note: EventRecord): string {
  if (typeof note.pubkey === "string" && note.pubkey.length > 0) {
    return truncateMiddle(note.pubkey);
  }
  return "unknown author";
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
  const urls = content.match(/https?:\/\/\S+/g) ?? [];
  const domains = urls
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
  const matches = note.content.match(/(^|\s)#([a-z0-9_]+)/gi) ?? [];
  const hashtags = matches
    .map((entry) => {
      const normalized = entry.trim().replace(/^#/, "").toLowerCase();
      return normalized.replace(/[^a-z0-9_]/g, "");
    })
    .filter((value) => value.length > 0);
  return Array.from(new Set(hashtags));
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
