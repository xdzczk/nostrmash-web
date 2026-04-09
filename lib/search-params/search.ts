import type { SearchQuery } from "@/lib/api/endpoints";

export function parseSearchQuery(raw: Record<string, string | string[] | undefined>): SearchQuery {
  const q = toSingle(raw.q)?.trim() ?? "";
  const tab = toSingle(raw.tab);
  const limit = parsePositiveInt(toSingle(raw.limit));
  const cursor = toSingle(raw.cursor)?.trim();

  return {
    q,
    tab: tab === "notes" || tab === "profiles" || tab === "all" ? tab : "all",
    limit: clamp(limit ?? 20, 1, 100),
    cursor: cursor && cursor.length > 0 ? cursor : undefined,
  };
}

function toSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
