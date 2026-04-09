import type { EventRecord, Profile } from "@/lib/types/api";

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

export function profileLabel(profile: Profile): string {
  const displayName =
    typeof profile.display_name === "string" ? profile.display_name.trim() : undefined;
  const name = typeof profile.name === "string" ? profile.name.trim() : undefined;
  const npub = typeof profile.npub === "string" ? profile.npub.trim() : undefined;
  const pubkey = typeof profile.pubkey === "string" ? profile.pubkey.trim() : undefined;

  const isHexLike = (value: string | undefined): boolean =>
    typeof value === "string" && /^[0-9a-f]{40,}$/i.test(value);

  return (
    (displayName && !isHexLike(displayName) ? displayName : undefined) ??
    (name && !isHexLike(name) ? name : undefined) ??
    npub ??
    truncateMiddle(pubkey ?? "unknown")
  );
}

export function profileIdentifier(profile: Profile): string {
  const npub = typeof profile.npub === "string" ? profile.npub.trim() : "";
  const pubkey = typeof profile.pubkey === "string" ? profile.pubkey.trim() : "";
  return npub || pubkey || "unknown";
}

export function profileSecondaryLabel(profile: Profile): string | null {
  const displayName =
    typeof profile.display_name === "string" && profile.display_name.trim().length > 0
      ? profile.display_name.trim()
      : null;
  const name =
    typeof profile.name === "string" && profile.name.trim().length > 0 ? profile.name.trim() : null;
  const nip05 =
    typeof profile.nip05 === "string" && profile.nip05.trim().length > 0
      ? profile.nip05.trim()
      : null;
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
