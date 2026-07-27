import type {
  Profile,
  SearchApiResponse,
  SearchNotesApiResponse,
  SearchProfilesApiResponse,
  SearchResponse,
  SearchSuggestApiResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import {
  extractNativeApiSemantics,
  normalizeEventRecord,
  normalizeEventRecords,
  normalizeHashtagEntries,
  normalizeProfiles,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import {
  buildSearchQuery,
  buildSearchSectionTotals,
  looksLikeEventIdentifier,
  looksLikeProfileIdentifier,
  nativeApiV1Routes,
  normalizeProfileSearchQueryText,
  normalizeRelayHints,
  normalizeSearchQueryText,
  toSearchCursor,
  type SearchQuery,
} from "@/lib/api/endpoints/shared";
import { getEvent } from "@/lib/api/endpoints/notes";
import { getProfile } from "@/lib/api/endpoints/profiles";

async function fetchSearchNotes(
  query: Pick<SearchQuery, "q" | "limit" | "offset">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchNotesApiResponse>(nativeApiV1Routes.searchNotes, {
    cacheClass,
    query: buildSearchQuery(query),
  });
}

async function fetchSearchProfiles(
  query: Pick<SearchQuery, "q" | "limit" | "offset">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchProfilesApiResponse>(nativeApiV1Routes.searchProfiles, {
    cacheClass,
    query: buildSearchQuery(query),
  });
}

async function fetchSearchSuggest(query: Pick<SearchQuery, "q" | "limit">, cacheClass: CacheClass) {
  return fetchApiJson<SearchSuggestApiResponse>(nativeApiV1Routes.searchSuggest, {
    cacheClass,
    query,
  });
}

async function fetchSearch(query: Pick<SearchQuery, "q" | "limit">, cacheClass: CacheClass) {
  return fetchApiJson<SearchApiResponse>(nativeApiV1Routes.search, {
    cacheClass,
    query,
  });
}
export async function getSearch(
  query: SearchQuery,
  cacheClass: CacheClass = "requestTime"
): Promise<SearchResponse> {
  const normalizedQueryText = normalizeSearchQueryText(query.q);
  const normalizedProfileQueryText = normalizeProfileSearchQueryText(query.q);
  const searchQuery = {
    q: normalizedQueryText,
    limit: query.limit,
    offset: query.offset,
  } satisfies Pick<SearchQuery, "q" | "limit" | "offset">;
  const profileSearchQuery = {
    q: normalizedProfileQueryText,
    limit: query.limit,
    offset: query.offset,
  } satisfies Pick<SearchQuery, "q" | "limit" | "offset">;
  const combinedSearchQuery = {
    q: normalizedQueryText,
    limit: query.limit,
  } satisfies Pick<SearchQuery, "q" | "limit">;
  const dedupeProfiles = (profiles: Profile[]): Profile[] =>
    Array.from(
      new Map(
        profiles
          .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
          .map((profile) => [profile.pubkey, profile])
      ).values()
    );

  if (query.tab === "notes") {
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

  if (query.tab === "profiles") {
    const profilesResponse = await fetchSearchProfiles(profileSearchQuery, cacheClass);
    const profiles = normalizeProfiles(profilesResponse.profiles);
    const currentOffset =
      typeof profilesResponse.offset === "number" ? profilesResponse.offset : (query.offset ?? 0);
    const nextOffset =
      typeof query.limit === "number" && profiles.length >= query.limit
        ? currentOffset + profiles.length
        : undefined;
    let directProfileMatch: Profile[] = [];
    if (profiles.length === 0 && looksLikeProfileIdentifier(normalizedProfileQueryText)) {
      try {
        const profile = await getProfile(normalizedProfileQueryText, cacheClass);
        directProfileMatch = [profile];
      } catch {
        directProfileMatch = [];
      }
    }
    const mergedProfiles = Array.from(
      new Map(
        [...profiles, ...directProfileMatch]
          .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
          .map((profile) => [profile.pubkey, profile])
      ).values()
    );
    const sectionTotals = buildSearchSectionTotals(0, mergedProfiles.length, 0, 0, 0);
    const semantics = extractNativeApiSemantics(profilesResponse);
    const profilesCursor = toSearchCursor(profilesResponse);
    return {
      ...semantics,
      ...profilesResponse,
      notes: [],
      profiles: mergedProfiles,
      profile_suggestions: [],
      hashtags: [],
      relays: [],
      offset: currentOffset,
      next_offset: nextOffset,
      next_cursor: profilesCursor ?? semantics.next_cursor,
      surface_cursors: profilesCursor ? { profiles: profilesCursor } : undefined,
      total:
        typeof profilesResponse.total === "number" ? profilesResponse.total : mergedProfiles.length,
      section_totals: {
        ...sectionTotals,
        ...(profilesResponse.section_totals ?? {}),
      },
    } satisfies SearchResponse;
  }

  const [
    searchResult,
    notesResult,
    profilesResult,
    suggestResult,
    directProfileResult,
    directNoteResult,
  ] = await Promise.allSettled([
    fetchSearch(combinedSearchQuery, cacheClass),
    fetchSearchNotes(
      {
        q: normalizedQueryText,
        limit: query.limit,
        offset: 0,
      },
      cacheClass
    ),
    fetchSearchProfiles(
      {
        q: normalizedProfileQueryText,
        limit: query.limit,
        offset: 0,
      },
      cacheClass
    ),
    fetchSearchSuggest(
      {
        q: normalizedProfileQueryText,
        limit: Math.min(query.limit ?? 20, 20),
      },
      cacheClass
    ),
    looksLikeProfileIdentifier(normalizedProfileQueryText)
      ? getProfile(normalizedProfileQueryText, cacheClass)
      : Promise.resolve(null),
    looksLikeEventIdentifier(normalizedQueryText)
      ? getEvent(normalizedQueryText, cacheClass)
      : Promise.resolve(null),
  ]);

  const notesFromSearch =
    searchResult.status === "fulfilled"
      ? normalizeEventRecords(searchResult.value.notes ?? searchResult.value.events)
      : [];
  const notesFromNotesSurface =
    notesResult.status === "fulfilled" ? normalizeEventRecords(notesResult.value.notes) : [];
  const directNoteMatch =
    directNoteResult.status === "fulfilled" && directNoteResult.value
      ? (() => {
          const normalized = normalizeEventRecord(
            directNoteResult.value.event ?? directNoteResult.value
          );
          return normalized ? [normalized] : [];
        })()
      : [];
  const notes = Array.from(
    new Map(
      [
        ...(notesFromNotesSurface.length > 0 ? notesFromNotesSurface : notesFromSearch),
        ...directNoteMatch,
      ].map((note) => [note.id, note])
    ).values()
  );

  const profilesFromSearch =
    searchResult.status === "fulfilled" ? normalizeProfiles(searchResult.value.profiles) : [];
  const profilesFromProfilesSurface =
    profilesResult.status === "fulfilled" ? normalizeProfiles(profilesResult.value.profiles) : [];
  const profiles = dedupeProfiles(
    profilesFromProfilesSurface.length > 0 ? profilesFromProfilesSurface : profilesFromSearch
  );
  const profileSuggestions =
    suggestResult.status === "fulfilled"
      ? normalizeProfiles(suggestResult.value.profiles ?? suggestResult.value.suggested_profiles)
      : searchResult.status === "fulfilled"
        ? normalizeProfiles(searchResult.value.profile_suggestions)
        : [];
  const hashtags =
    suggestResult.status === "fulfilled"
      ? normalizeHashtagEntries(
          suggestResult.value.hashtags ?? suggestResult.value.suggested_hashtags
        )
      : searchResult.status === "fulfilled"
        ? normalizeHashtagEntries(searchResult.value.hashtags)
        : [];
  const relays =
    suggestResult.status === "fulfilled"
      ? normalizeRelayHints(suggestResult.value.relays)
      : searchResult.status === "fulfilled"
        ? normalizeRelayHints(searchResult.value.relays)
        : [];
  const directProfileMatch =
    directProfileResult.status === "fulfilled" && directProfileResult.value
      ? [directProfileResult.value]
      : [];
  const mergedProfiles = dedupeProfiles([...profiles, ...directProfileMatch]);
  const uniqueSuggestions = dedupeProfiles(profileSuggestions);
  const promotedSuggestions =
    mergedProfiles.length === 0 && directProfileMatch.length === 0 ? uniqueSuggestions : [];
  const effectiveProfiles = dedupeProfiles([...mergedProfiles, ...promotedSuggestions]);
  const remainingSuggestions =
    promotedSuggestions.length === 0
      ? uniqueSuggestions
      : uniqueSuggestions.filter(
          (profile) => !effectiveProfiles.some((candidate) => candidate.pubkey === profile.pubkey)
        );

  const surfaceErrors: NonNullable<SearchResponse["surface_errors"]> = {};
  if (searchResult.status === "rejected") {
    surfaceErrors.search =
      searchResult.reason instanceof Error ? searchResult.reason.message : "Search failed.";
  }
  if (notesResult.status === "rejected") {
    surfaceErrors.notes =
      notesResult.reason instanceof Error ? notesResult.reason.message : "Notes search failed.";
  }
  if (profilesResult.status === "rejected") {
    surfaceErrors.profiles =
      profilesResult.reason instanceof Error
        ? profilesResult.reason.message
        : "Profiles search failed.";
  }
  if (suggestResult.status === "rejected") {
    surfaceErrors.suggest =
      suggestResult.reason instanceof Error ? suggestResult.reason.message : "Suggest failed.";
  }

  if (
    searchResult.status === "rejected" &&
    notesResult.status === "rejected" &&
    profilesResult.status === "rejected" &&
    suggestResult.status === "rejected"
  ) {
    throw new Error(
      Object.values(surfaceErrors).join(" | ") || "All search surfaces failed for this query."
    );
  }

  const sourceSectionTotals = [searchResult, notesResult, profilesResult, suggestResult]
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<{ section_totals?: SearchResponse["section_totals"] }> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value.section_totals)
    .find((entry) => entry !== undefined);

  const semantics = extractNativeApiSemantics(
    searchResult.status === "fulfilled" ? searchResult.value : undefined,
    notesResult.status === "fulfilled" ? notesResult.value : undefined,
    profilesResult.status === "fulfilled" ? profilesResult.value : undefined,
    suggestResult.status === "fulfilled" ? suggestResult.value : undefined
  );
  const surfaceCursors = {
    search: searchResult.status === "fulfilled" ? toSearchCursor(searchResult.value) : undefined,
    notes: notesResult.status === "fulfilled" ? toSearchCursor(notesResult.value) : undefined,
    profiles:
      profilesResult.status === "fulfilled" ? toSearchCursor(profilesResult.value) : undefined,
    suggest: suggestResult.status === "fulfilled" ? toSearchCursor(suggestResult.value) : undefined,
  } satisfies NonNullable<SearchResponse["surface_cursors"]>;
  const surfaceOffsets = {
    notes:
      notesResult.status === "fulfilled" &&
      typeof query.limit === "number" &&
      notesFromNotesSurface.length >= query.limit
        ? notesFromNotesSurface.length
        : undefined,
    profiles:
      profilesResult.status === "fulfilled" &&
      typeof query.limit === "number" &&
      profilesFromProfilesSurface.length >= query.limit
        ? profilesFromProfilesSurface.length
        : undefined,
  } satisfies NonNullable<SearchResponse["surface_offsets"]>;
  const sectionTotals = buildSearchSectionTotals(
    notes.length,
    effectiveProfiles.length,
    remainingSuggestions.length,
    hashtags.length,
    relays.length
  );
  const errors = Object.values(surfaceErrors).filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  const nextCursor =
    surfaceCursors.search ??
    surfaceCursors.notes ??
    surfaceCursors.profiles ??
    surfaceCursors.suggest ??
    semantics.next_cursor;

  return {
    ...semantics,
    notes,
    profiles: effectiveProfiles,
    profile_suggestions: remainingSuggestions,
    hashtags,
    relays,
    next_cursor: nextCursor,
    surface_errors: Object.keys(surfaceErrors).length > 0 ? surfaceErrors : undefined,
    surface_cursors: Object.values(surfaceCursors).some((value) => typeof value === "string")
      ? surfaceCursors
      : undefined,
    surface_offsets: Object.values(surfaceOffsets).some((value) => typeof value === "number")
      ? surfaceOffsets
      : undefined,
    total:
      searchResult.status === "fulfilled" && typeof searchResult.value.total === "number"
        ? searchResult.value.total
        : notes.length + effectiveProfiles.length + hashtags.length + relays.length,
    section_totals: {
      ...(sourceSectionTotals ?? {}),
      ...sectionTotals,
    },
    errors: errors.length > 0 ? errors : undefined,
  } satisfies SearchResponse;
}
