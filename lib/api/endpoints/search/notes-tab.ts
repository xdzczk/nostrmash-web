import type { SearchResponse } from "@/lib/types/api";
import { extractNativeApiSemantics, normalizeEventRecords } from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import {
  looksLikeEventIdentifier,
  toSearchCursor,
  type SearchQuery,
} from "@/lib/api/endpoints/shared";
import { resolveReportedTotals } from "@/lib/search/totals";
import {
  lookupNoteWithEngagement,
  withSearchEngagementCounts,
} from "@/lib/api/endpoints/search/engagement";
import { fetchSearchNotes } from "@/lib/api/endpoints/search/fetchers";

export async function searchNotesTab(
  query: SearchQuery,
  normalizedQueryText: string,
  cacheClass: CacheClass
): Promise<SearchResponse> {
  const searchQuery = {
    q: normalizedQueryText,
    limit: query.limit,
    offset: query.offset,
    cursor: query.cursor,
    correction: query.correction,
    lang: query.lang,
    window: query.window,
    sort: query.sort,
  } satisfies Pick<
    SearchQuery,
    "q" | "limit" | "offset" | "cursor" | "correction" | "lang" | "window" | "sort"
  >;

  const notesResponse = await fetchSearchNotes(searchQuery, cacheClass);
  const notes = await withSearchEngagementCounts(
    normalizeEventRecords(notesResponse.notes),
    cacheClass
  );
  const currentOffset =
    typeof notesResponse.offset === "number" ? notesResponse.offset : (query.offset ?? 0);
  const nextOffset =
    typeof query.limit === "number" && notes.length >= query.limit
      ? currentOffset + notes.length
      : undefined;

  let directNoteMatch = [] as NonNullable<SearchResponse["notes"]>;
  if (notes.length === 0 && looksLikeEventIdentifier(normalizedQueryText)) {
    const directEvent = await lookupNoteWithEngagement(normalizedQueryText, cacheClass);
    directNoteMatch = directEvent ? [directEvent] : [];
  }

  const mergedNotes = Array.from(
    new Map([...notes, ...directNoteMatch].map((note) => [note.id, note])).values()
  );
  const semantics = extractNativeApiSemantics(notesResponse);
  const notesCursor = toSearchCursor(notesResponse);
  const reported = resolveReportedTotals({
    apiTotal: notesResponse.total,
    apiSectionTotals: notesResponse.section_totals,
    page: {
      notes: mergedNotes.length,
      profiles: 0,
      profile_suggestions: 0,
      hashtags: 0,
      relays: 0,
    },
    limit: query.limit,
  });

  return {
    ...semantics,
    ...notesResponse,
    notes: mergedNotes,
    profiles: [],
    profile_suggestions: [],
    hashtags: [],
    relays: [],
    offset: currentOffset,
    next_offset: nextOffset,
    next_cursor: notesCursor ?? semantics.next_cursor,
    surface_cursors: notesCursor ? { notes: notesCursor } : undefined,
    total: reported.total,
    totals_source: reported.totals_source,
    section_totals: reported.section_totals,
  } satisfies SearchResponse;
}
