import type { SearchResponse } from "@/lib/types/api";

export type TotalsSource = "api" | "page";

export type PageCounts = {
  notes: number;
  profiles: number;
  profile_suggestions: number;
  hashtags: number;
  relays: number;
};

function numeric(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function corpusCount(
  value: unknown,
  pageCount: number,
  limit: number | undefined
): number | undefined {
  const count = numeric(value);
  if (count === undefined) return undefined;
  // A full page whose reported total is no larger than the rows in hand is
  // the index echoing the slice, not a corpus estimate.
  if (typeof limit === "number" && pageCount >= limit && count <= pageCount) return undefined;
  return count;
}

/**
 * Prefer counts the index reported. Page lengths fill gaps only when the
 * index sent nothing, and those responses are marked `page` so the UI does
 * not present a slice length as the size of the corpus.
 */
export function resolveReportedTotals(input: {
  apiTotal: unknown;
  apiSectionTotals?: SearchResponse["section_totals"];
  page: PageCounts;
  limit?: number;
}): {
  total?: number;
  totals_source: TotalsSource;
  section_totals: NonNullable<SearchResponse["section_totals"]>;
} {
  const api = input.apiSectionTotals;
  const notes = corpusCount(api?.notes, input.page.notes, input.limit);
  const profiles = corpusCount(api?.profiles, input.page.profiles, input.limit);
  const suggestions = corpusCount(
    api?.profile_suggestions,
    input.page.profile_suggestions,
    input.limit
  );
  const hashtags = corpusCount(api?.hashtags, input.page.hashtags, input.limit);
  const relays = corpusCount(api?.relays, input.page.relays, input.limit);
  const pageSum =
    input.page.notes +
    input.page.profiles +
    input.page.profile_suggestions +
    input.page.hashtags +
    input.page.relays;
  const total = corpusCount(input.apiTotal, pageSum, input.limit);
  const fromApi =
    total !== undefined ||
    notes !== undefined ||
    profiles !== undefined ||
    hashtags !== undefined ||
    relays !== undefined;

  if (!fromApi) {
    return {
      total: undefined,
      totals_source: "page",
      section_totals: { ...input.page },
    };
  }

  return {
    total,
    totals_source: "api",
    section_totals: {
      ...(notes !== undefined ? { notes } : {}),
      ...(profiles !== undefined ? { profiles } : {}),
      ...(suggestions !== undefined ? { profile_suggestions: suggestions } : {}),
      ...(hashtags !== undefined ? { hashtags } : {}),
      ...(relays !== undefined ? { relays } : {}),
    },
  };
}
