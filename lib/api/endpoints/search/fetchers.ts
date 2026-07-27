import type {
  SearchApiResponse,
  SearchNotesApiResponse,
  SearchProfilesApiResponse,
  SearchSuggestApiResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import type { CacheClass } from "@/lib/caching/policies";
import { buildSearchQuery, nativeApiV1Routes, type SearchQuery } from "@/lib/api/endpoints/shared";

export async function fetchSearchNotes(
  query: Pick<SearchQuery, "q" | "limit" | "offset">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchNotesApiResponse>(nativeApiV1Routes.searchNotes, {
    cacheClass,
    query: buildSearchQuery(query),
  });
}

export async function fetchSearchProfiles(
  query: Pick<SearchQuery, "q" | "limit" | "offset">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchProfilesApiResponse>(nativeApiV1Routes.searchProfiles, {
    cacheClass,
    query: buildSearchQuery(query),
  });
}

export async function fetchSearchSuggest(
  query: Pick<SearchQuery, "q" | "limit">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchSuggestApiResponse>(nativeApiV1Routes.searchSuggest, {
    cacheClass,
    query,
  });
}

export async function fetchSearch(query: Pick<SearchQuery, "q" | "limit">, cacheClass: CacheClass) {
  return fetchApiJson<SearchApiResponse>(nativeApiV1Routes.search, {
    cacheClass,
    query,
  });
}
