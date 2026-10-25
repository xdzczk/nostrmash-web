import type { SearchQuery, SearchSort, SearchTab, SearchWindow } from "@/lib/api/endpoints";
import { parseLanguage } from "@/lib/search-params/language";

export const SEARCH_WINDOWS = [
  "24h",
  "7d",
  "30d",
  "all",
] as const satisfies readonly SearchWindow[];
export const DEFAULT_SEARCH_WINDOW: SearchWindow = "all";
export const SEARCH_SORTS = ["relevant", "latest"] as const satisfies readonly SearchSort[];
export const DEFAULT_SEARCH_SORT: SearchSort = "relevant";

const SEARCH_TABS = [
  "all",
  "notes",
  "profiles",
  "hashtags",
  "relays",
] as const satisfies readonly SearchTab[];

export function parseSearchQuery(raw: Record<string, string | string[] | undefined>): SearchQuery {
  const q = toSingle(raw.q)?.trim() ?? "";
  const tab = toSingle(raw.tab);
  const limit = parsePositiveInt(toSingle(raw.limit));
  const offset = parseNonNegativeInt(toSingle(raw.offset));
  const cursor = toSingle(raw.cursor)?.trim();
  const window = toSingle(raw.window);
  const sort = toSingle(raw.sort);

  return {
    q,
    tab: isSearchTab(tab) ? tab : "all",
    limit: clamp(limit ?? 20, 1, 100),
    // cursor and offset are mutually exclusive; the cursor wins.
    offset: cursor ? 0 : clamp(offset ?? 0, 0, 5000),
    cursor: cursor && cursor.length > 0 ? cursor : undefined,
    correction: toSingle(raw.correction) === "0" ? "0" : undefined,
    lang: parseLanguage(toSingle(raw.lang)),
    window: window === "24h" || window === "7d" || window === "30d" ? window : undefined,
    sort: sort === "latest" ? "latest" : undefined,
  };
}

function isSearchTab(value: string | undefined): value is SearchTab {
  return SEARCH_TABS.some((tab) => tab === value);
}

/** Continuation actions close over the filters from the page that rendered them. */
export function encodeSearchFilters(
  query: Pick<SearchQuery, "correction" | "lang" | "window" | "sort">
): string {
  return JSON.stringify({
    correction: query.correction === "0" ? "0" : "",
    lang: query.lang ?? "",
    window: query.window ?? "",
    sort: query.sort ?? "",
  });
}

export function decodeSearchFilters(
  raw: string
): Pick<SearchQuery, "correction" | "lang" | "window" | "sort"> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const record = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const window = typeof record.window === "string" ? record.window : undefined;
  const sort = typeof record.sort === "string" ? record.sort : undefined;
  return {
    correction: record.correction === "0" ? "0" : undefined,
    lang: parseLanguage(typeof record.lang === "string" ? record.lang : undefined),
    window: window === "24h" || window === "7d" || window === "30d" ? window : undefined,
    sort: sort === "latest" ? "latest" : undefined,
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
