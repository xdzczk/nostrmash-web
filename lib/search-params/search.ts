import type { SearchQuery } from "@/lib/api/endpoints";

export function parseSearchQuery(raw: Record<string, string | string[] | undefined>): SearchQuery {
  const q = toSingle(raw.q)?.trim() ?? "";
  const tab = toSingle(raw.tab);
  const limit = parsePositiveInt(toSingle(raw.limit));
  const offset = parseNonNegativeInt(toSingle(raw.offset));
  const window = toSingle(raw.window);

  return {
    q,
    tab: tab === "notes" || tab === "profiles" || tab === "all" ? tab : "all",
    limit: limit ?? 20,
    offset: offset ?? 0,
    window: window === "24h" || window === "7d" ? window : "7d",
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

function parseNonNegativeInt(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}
