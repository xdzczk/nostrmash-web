import type { EventRecord, SearchResponse } from "@/lib/types/api";
import {
  extractNativeApiSemantics,
  normalizeEventRecords,
  normalizeHashtagEntries,
  normalizeProfiles,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import { getProfile } from "@/lib/api/endpoints/profiles";
import {
  buildSearchSectionTotals,
  looksLikeEventIdentifier,
  looksLikeProfileIdentifier,
  normalizeRelayHints,
  toSearchCursor,
  type SearchQuery,
} from "@/lib/api/endpoints/shared";
import {
  lookupNoteWithEngagement,
  withSearchEngagementCounts,
} from "@/lib/api/endpoints/search/engagement";
import {
  fetchSearch,
  fetchSearchNotes,
  fetchSearchProfiles,
  fetchSearchSuggest,
} from "@/lib/api/endpoints/search/fetchers";
import { dedupeProfiles } from "@/lib/api/endpoints/search/helpers";

function hasSuggestBundle(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.include) && record.include.map(String).includes("suggest")) {
    return true;
  }
  return (
    Array.isArray(record.suggested_profiles) ||
    Array.isArray(record.profile_suggestions) ||
    Array.isArray(record.suggested_hashtags)
  );
}

async function searchAllTabLegacy(
  query: SearchQuery,
  normalizedQueryText: string,
  normalizedProfileQueryText: string,
  cacheClass: CacheClass
): Promise<SearchResponse> {
  const [
    searchResult,
    notesResult,
    profilesResult,
    suggestResult,
    directProfileResult,
    directNoteResult,
  ] = await Promise.allSettled([
    fetchSearch(
      {
        q: normalizedQueryText,
        limit: query.limit,
      },
      cacheClass
    ),
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
      ? lookupNoteWithEngagement(normalizedQueryText, cacheClass)
      : Promise.resolve(null),
  ]);

  return mergeAllTabResults({
    query,
    cacheClass,
    searchResult,
    notesResult,
    profilesResult,
    suggestResult,
    directProfileResult,
    directNoteResult,
  });
}

type Settled<T> = PromiseSettledResult<T>;

async function mergeAllTabResults(args: {
  query: SearchQuery;
  cacheClass: CacheClass;
  searchResult: Settled<Awaited<ReturnType<typeof fetchSearch>>>;
  notesResult?: Settled<Awaited<ReturnType<typeof fetchSearchNotes>>>;
  profilesResult?: Settled<Awaited<ReturnType<typeof fetchSearchProfiles>>>;
  suggestResult?: Settled<Awaited<ReturnType<typeof fetchSearchSuggest>>>;
  directProfileResult: Settled<Awaited<ReturnType<typeof getProfile>> | null>;
  directNoteResult: Settled<EventRecord | null>;
}): Promise<SearchResponse> {
  const {
    query,
    cacheClass,
    searchResult,
    notesResult,
    profilesResult,
    suggestResult,
    directProfileResult,
    directNoteResult,
  } = args;

  const notesFromSearch =
    searchResult.status === "fulfilled"
      ? normalizeEventRecords(searchResult.value.notes ?? searchResult.value.events)
      : [];
  const notesFromNotesSurface =
    notesResult?.status === "fulfilled" ? normalizeEventRecords(notesResult.value.notes) : [];
  const directNoteMatch =
    directNoteResult.status === "fulfilled" && directNoteResult.value
      ? [directNoteResult.value]
      : [];
  const notes = await withSearchEngagementCounts(
    Array.from(
      new Map(
        [
          ...(notesFromNotesSurface.length > 0 ? notesFromNotesSurface : notesFromSearch),
          ...directNoteMatch,
        ].map((note) => [note.id, note])
      ).values()
    ),
    cacheClass
  );

  const profilesFromSearch =
    searchResult.status === "fulfilled" ? normalizeProfiles(searchResult.value.profiles) : [];
  const profilesFromProfilesSurface =
    profilesResult?.status === "fulfilled" ? normalizeProfiles(profilesResult.value.profiles) : [];
  const profiles = dedupeProfiles(
    profilesFromProfilesSurface.length > 0 ? profilesFromProfilesSurface : profilesFromSearch
  );
  const profileSuggestions =
    suggestResult?.status === "fulfilled"
      ? normalizeProfiles(suggestResult.value?.profiles ?? suggestResult.value?.suggested_profiles)
      : searchResult.status === "fulfilled"
        ? normalizeProfiles(
            searchResult.value?.profile_suggestions ?? searchResult.value?.suggested_profiles
          )
        : [];
  const hashtags =
    suggestResult?.status === "fulfilled"
      ? normalizeHashtagEntries(
          suggestResult.value?.hashtags ?? suggestResult.value?.suggested_hashtags
        )
      : searchResult.status === "fulfilled"
        ? normalizeHashtagEntries(
            searchResult.value?.hashtags ?? searchResult.value?.suggested_hashtags
          )
        : [];
  const relays =
    suggestResult?.status === "fulfilled"
      ? normalizeRelayHints(suggestResult.value?.relays)
      : searchResult.status === "fulfilled"
        ? normalizeRelayHints(searchResult.value?.relays)
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
    surfaceErrors.search = "Search failed.";
  }
  if (notesResult?.status === "rejected") {
    surfaceErrors.notes = "Notes search failed.";
  }
  if (profilesResult?.status === "rejected") {
    surfaceErrors.profiles = "Profiles search failed.";
  }
  if (suggestResult?.status === "rejected") {
    surfaceErrors.suggest = "Suggest failed.";
  }

  if (
    searchResult.status === "rejected" &&
    notesResult?.status === "rejected" &&
    profilesResult?.status === "rejected" &&
    suggestResult?.status === "rejected"
  ) {
    throw new Error("All search surfaces failed for this query.");
  }

  const sourceSectionTotals = [searchResult, notesResult, profilesResult, suggestResult]
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<{ section_totals?: SearchResponse["section_totals"] }> =>
        Boolean(result) && result!.status === "fulfilled"
    )
    .map((result) => result.value.section_totals)
    .find((entry) => entry !== undefined);

  const semantics = extractNativeApiSemantics(
    searchResult.status === "fulfilled" ? searchResult.value : undefined,
    notesResult?.status === "fulfilled" ? notesResult.value : undefined,
    profilesResult?.status === "fulfilled" ? profilesResult.value : undefined,
    suggestResult?.status === "fulfilled" ? suggestResult.value : undefined
  );
  const surfaceCursors = {
    search: searchResult.status === "fulfilled" ? toSearchCursor(searchResult.value) : undefined,
    notes: notesResult?.status === "fulfilled" ? toSearchCursor(notesResult.value) : undefined,
    profiles:
      profilesResult?.status === "fulfilled" ? toSearchCursor(profilesResult.value) : undefined,
    suggest:
      suggestResult?.status === "fulfilled" ? toSearchCursor(suggestResult.value) : undefined,
  } satisfies NonNullable<SearchResponse["surface_cursors"]>;
  const surfaceOffsets = {
    notes:
      notesResult?.status === "fulfilled" &&
      typeof query.limit === "number" &&
      notesFromNotesSurface.length >= query.limit
        ? notesFromNotesSurface.length
        : undefined,
    profiles:
      profilesResult?.status === "fulfilled" &&
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

export async function searchAllTab(
  query: SearchQuery,
  normalizedQueryText: string,
  normalizedProfileQueryText: string,
  cacheClass: CacheClass
): Promise<SearchResponse> {
  const [bundleResult, directProfileResult, directNoteResult] = await Promise.allSettled([
    fetchSearch(
      {
        q: normalizedQueryText,
        limit: query.limit,
        include: "suggest",
      },
      cacheClass
    ),
    looksLikeProfileIdentifier(normalizedProfileQueryText)
      ? getProfile(normalizedProfileQueryText, cacheClass)
      : Promise.resolve(null),
    looksLikeEventIdentifier(normalizedQueryText)
      ? lookupNoteWithEngagement(normalizedQueryText, cacheClass)
      : Promise.resolve(null),
  ]);

  if (bundleResult.status === "fulfilled" && hasSuggestBundle(bundleResult.value)) {
    return mergeAllTabResults({
      query,
      cacheClass,
      searchResult: bundleResult,
      directProfileResult,
      directNoteResult,
    });
  }

  // Fallback for older backends that ignore include=suggest.
  return searchAllTabLegacy(query, normalizedQueryText, normalizedProfileQueryText, cacheClass);
}
