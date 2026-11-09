import { readSearchParam, type RouteSearchParams } from "@/lib/search-params/pagination";
import { parseLanguage } from "@/lib/search-params/language";
import { isStatsWindow, type StatsWindow } from "@/lib/search-params/window";

/** Page size sent to every ranked discovery list. The API default is 20. */
export const RANKED_PAGE_SIZE = 20;

/** Highest `offset` the ranked discovery endpoints accept. */
export const RANKED_MAX_OFFSET = 5000;

export const RANKING_SURFACES = [
  "notes",
  "profiles",
  "domains",
  "hashtags",
  "long-form",
  "pictures",
  "videos",
  "shorts",
  "rising",
  "conversations",
  "bookmarked",
  "zapped",
  "followed",
  "supported",
] as const;

export type RankingSurface = (typeof RANKING_SURFACES)[number];

const RANKING_SURFACE_SET = new Set<string>(RANKING_SURFACES);

export function isRankingSurface(value: string): value is RankingSurface {
  return RANKING_SURFACE_SET.has(value);
}

export function readRankedOffset(params: RouteSearchParams): number {
  const raw = Number.parseInt(readSearchParam(params, "offset") ?? "", 10);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(Math.floor(raw), RANKED_MAX_OFFSET);
}

export function rankedListRequest(
  window: StatsWindow | undefined,
  language: string | undefined,
  offset: number
): {
  window?: StatsWindow;
  offset: number;
  limit: number;
  lang?: string;
} {
  return {
    ...(window ? { window } : {}),
    offset,
    limit: RANKED_PAGE_SIZE,
    ...(language ? { lang: language } : {}),
  };
}

const WINDOWLESS_RANKINGS = new Set<RankingSurface>(["bookmarked", "followed"]);
const LANGUAGELESS_RANKINGS = new Set<RankingSurface>(["followed", "supported"]);

/**
 * Next-page query for a ranking. Bookmarked and followed omit `window`.
 * Followed and supported omit `lang`. An invalid window does not page.
 */
export function rankingContinuationQuery(
  surface: RankingSurface,
  window: string,
  lang: string,
  offset: number
): ReturnType<typeof rankedListRequest> | null {
  const windowless = WINDOWLESS_RANKINGS.has(surface);
  const statsWindow = isStatsWindow(window) ? window : undefined;
  if (!windowless && !statsWindow) return null;
  const language = LANGUAGELESS_RANKINGS.has(surface) ? undefined : parseLanguage(lang);
  return rankedListRequest(windowless ? undefined : statsWindow, language, offset);
}

export function rankingItemAnchor(surface: RankingSurface, item: unknown): string {
  if (typeof item === "string") {
    const text = item.trim().toLowerCase();
    return surface === "hashtags" || surface === "domains" ? text : "";
  }
  if (typeof item !== "object" || item === null) return "";
  const record = item as Record<string, unknown>;
  const text = (key: string) => (typeof record[key] === "string" ? record[key].trim() : "");
  switch (surface) {
    case "notes":
    case "conversations":
    case "long-form":
    case "pictures":
    case "videos":
    case "shorts":
    case "bookmarked":
    case "zapped":
      return (text("id") || text("event_id")).toLowerCase();
    case "profiles":
    case "rising":
    case "followed":
    case "supported":
      return text("pubkey").toLowerCase();
    case "hashtags":
      return (text("hashtag") || text("tag")).replace(/^#/, "").toLowerCase();
    case "domains":
      return text("domain").toLowerCase();
  }
}

const RANK_TOKEN_PREFIX = "rank:";

/** Continuation token: next offset, plus the first item of the page already shown. */
export function encodeRankedContinuation(offset: number, anchor: string): string {
  return `${RANK_TOKEN_PREFIX}${offset}:${encodeURIComponent(anchor)}`;
}

export function parseRankedContinuation(token: string): { offset: number; anchor: string } | null {
  if (typeof token !== "string" || !token.startsWith(RANK_TOKEN_PREFIX) || token.length > 2048) {
    return null;
  }
  const rest = token.slice(RANK_TOKEN_PREFIX.length);
  const colon = rest.indexOf(":");
  if (colon <= 0) return null;
  const offset = Number.parseInt(rest.slice(0, colon), 10);
  if (!Number.isFinite(offset) || offset < 0 || offset > RANKED_MAX_OFFSET) return null;
  let anchor = "";
  try {
    anchor = decodeURIComponent(rest.slice(colon + 1));
  } catch {
    return null;
  }
  if (anchor.length === 0 || anchor.length > 256) return null;
  return { offset: Math.floor(offset), anchor };
}

/**
 * Token for the following page when this page is full. A short page is the end
 * of the ranking. The anchor is this page's first item so a repeated page
 * (offset ignored) can be told apart from a real continuation.
 */
export function rankedPageContinuation(
  surface: RankingSurface,
  items: unknown[],
  offset: number,
  pageSize = RANKED_PAGE_SIZE
): { token?: string; nextOffset?: number } {
  if (items.length < pageSize) return {};
  const nextOffset = offset + items.length;
  if (nextOffset > RANKED_MAX_OFFSET) return {};
  const anchor = rankingItemAnchor(surface, items[0]);
  if (!anchor) return {};
  return { nextOffset, token: encodeRankedContinuation(nextOffset, anchor) };
}
