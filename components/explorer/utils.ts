import type { EventRecord, Profile } from "@/lib/types/api";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  return (
    profile.display_name ??
    profile.name ??
    profile.npub ??
    truncateMiddle(profile.pubkey ?? "unknown")
  );
}

export function profileIdentifier(profile: Profile): string {
  return profile.npub ?? profile.pubkey ?? "unknown";
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
