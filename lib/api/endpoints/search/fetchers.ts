import type {
  SearchApiResponse,
  SearchNotesApiResponse,
  SearchProfilesApiResponse,
  SearchSuggestApiResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import type { CacheClass } from "@/lib/caching/policies";
import { buildSearchQuery, nativeApiV1Routes, type SearchQuery } from "@/lib/api/endpoints/shared";
import {
  eventListResponseSchema,
  profileListResponseSchema,
  searchSuggestResponseSchema,
} from "@/lib/api/schemas/core";
import { z } from "zod";

const searchResponseSchema = eventListResponseSchema
  .extend({
    profiles: z.array(z.unknown()).optional(),
    hashtags: z.array(z.unknown()).optional(),
    relays: z.array(z.unknown()).optional(),
    suggested_profiles: z.array(z.unknown()).optional(),
    suggested_hashtags: z.array(z.unknown()).optional(),
    section_totals: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export async function fetchSearchNotes(
  query: Pick<SearchQuery, "q" | "limit" | "offset">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchNotesApiResponse>(nativeApiV1Routes.searchNotes, {
    cacheClass,
    query: buildSearchQuery(query),
    schema: eventListResponseSchema,
  });
}

export async function fetchSearchProfiles(
  query: Pick<SearchQuery, "q" | "limit" | "offset">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchProfilesApiResponse>(nativeApiV1Routes.searchProfiles, {
    cacheClass,
    query: buildSearchQuery(query),
    schema: profileListResponseSchema,
  });
}

export async function fetchSearchSuggest(
  query: Pick<SearchQuery, "q" | "limit">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchSuggestApiResponse>(nativeApiV1Routes.searchSuggest, {
    cacheClass,
    query,
    schema: searchSuggestResponseSchema,
  });
}

export async function fetchSearch(
  query: Pick<SearchQuery, "q" | "limit" | "include">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchApiResponse>(nativeApiV1Routes.search, {
    cacheClass,
    query: {
      q: query.q,
      limit: query.limit,
      include: query.include,
    },
    schema: searchResponseSchema,
  });
}
