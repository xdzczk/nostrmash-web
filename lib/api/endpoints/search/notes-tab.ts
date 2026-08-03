import type { SearchResponse } from "@/lib/types/api";
import { extractNativeApiSemantics, normalizeEventRecords } from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import {
  buildSearchSectionTotals,
  looksLikeEventIdentifier,
  toSearchCursor,
  type SearchQuery,
} from "@/lib/api/endpoints/shared";
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
  } satisfies Pick<SearchQuery, "q" | "limit" | "offset">;

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
  const sectionTotals = buildSearchSectionTotals(mergedNotes.length, 0, 0, 0, 0);
  const semantics = extractNativeApiSemantics(notesResponse);
  const notesCursor = toSearchCursor(notesResponse);

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
    total: typeof notesResponse.total === "number" ? notesResponse.total : mergedNotes.length,
    section_totals: {
      ...sectionTotals,
      ...(notesResponse.section_totals ?? {}),
    },
  } satisfies SearchResponse;
}
