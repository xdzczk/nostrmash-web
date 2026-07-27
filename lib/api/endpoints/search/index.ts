import type { SearchResponse } from "@/lib/types/api";
import type { CacheClass } from "@/lib/caching/policies";
import {
  normalizeProfileSearchQueryText,
  normalizeSearchQueryText,
  type SearchQuery,
} from "@/lib/api/endpoints/shared";
import { searchAllTab } from "@/lib/api/endpoints/search/all-tab";
import { searchNotesTab } from "@/lib/api/endpoints/search/notes-tab";
import { searchProfilesTab } from "@/lib/api/endpoints/search/profiles-tab";

export async function getSearch(
  query: SearchQuery,
  cacheClass: CacheClass = "requestTime"
): Promise<SearchResponse> {
  const normalizedQueryText = normalizeSearchQueryText(query.q);
  const normalizedProfileQueryText = normalizeProfileSearchQueryText(query.q);

  if (query.tab === "notes") {
    return searchNotesTab(query, normalizedQueryText, cacheClass);
  }

  if (query.tab === "profiles") {
    return searchProfilesTab(query, normalizedProfileQueryText, cacheClass);
  }

  return searchAllTab(query, normalizedQueryText, normalizedProfileQueryText, cacheClass);
}
