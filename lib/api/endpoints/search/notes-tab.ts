import type { SearchResponse } from "@/lib/types/api";
import {
  extractNativeApiSemantics,
  normalizeEventRecord,
  normalizeEventRecords,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import { getEvent } from "@/lib/api/endpoints/notes";
import {
  buildSearchSectionTotals,
  looksLikeEventIdentifier,
  toSearchCursor,
  type SearchQuery,
} from "@/lib/api/endpoints/shared";
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
  const notes = normalizeEventRecords(notesResponse.notes);
  const currentOffset =
    typeof notesResponse.offset === "number" ? notesResponse.offset : (query.offset ?? 0);
  const nextOffset =
    typeof query.limit === "number" && notes.length >= query.limit
      ? currentOffset + notes.length
      : undefined;

  let directNoteMatch = [] as NonNullable<SearchResponse["notes"]>;
  if (notes.length === 0 && looksLikeEventIdentifier(normalizedQueryText)) {
    try {
      const eventResponse = await getEvent(normalizedQueryText, cacheClass);
      const directEvent = normalizeEventRecord(eventResponse.event ?? eventResponse);
      directNoteMatch = directEvent ? [directEvent] : [];
    } catch {
      directNoteMatch = [];
    }
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
