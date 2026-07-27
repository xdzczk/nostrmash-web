import type { Profile, SearchResponse } from "@/lib/types/api";
import { extractNativeApiSemantics, normalizeProfiles } from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import { getProfile } from "@/lib/api/endpoints/profiles";
import {
  buildSearchSectionTotals,
  looksLikeProfileIdentifier,
  toSearchCursor,
  type SearchQuery,
} from "@/lib/api/endpoints/shared";
import { fetchSearchProfiles } from "@/lib/api/endpoints/search/fetchers";
import { dedupeProfiles } from "@/lib/api/endpoints/search/helpers";

export async function searchProfilesTab(
  query: SearchQuery,
  normalizedProfileQueryText: string,
  cacheClass: CacheClass
): Promise<SearchResponse> {
  const profileSearchQuery = {
    q: normalizedProfileQueryText,
    limit: query.limit,
    offset: query.offset,
  } satisfies Pick<SearchQuery, "q" | "limit" | "offset">;

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

  const mergedProfiles = dedupeProfiles([...profiles, ...directProfileMatch]);
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
