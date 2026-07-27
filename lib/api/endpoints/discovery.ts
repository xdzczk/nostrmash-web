import type {
  DiscoveryHomeResponse,
  HotConversationsResponse,
  RisingProfilesResponse,
  TrendingDomainsApiResponse,
  TrendingDomainsResponse,
  TrendingHashtagsResponse,
  TrendingLongFormApiResponse,
  TrendingLongFormResponse,
  TrendingNotesResponse,
  TrendingProfilesResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import {
  normalizeDiscoveryHomeResponse,
  normalizeDomainEntries,
  normalizeEventRecords,
  normalizeHashtagEntries,
  normalizeProfiles,
  normalizeTrendingLongFormResponse,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import {
  buildCursorQuery,
  buildOffsetQuery,
  type CursorQuery,
  type OffsetQuery,
  nativeApiV1Routes,
  normalizeHotConversationNotes,
} from "@/lib/api/endpoints/shared";

export async function getDiscoveryHome(cacheClass: CacheClass = "shortTtl") {
  const response = await fetchApiJson<DiscoveryHomeResponse>(nativeApiV1Routes.discoveryHome, {
    cacheClass,
  });
  return normalizeDiscoveryHomeResponse(response);
}
export async function getTrendingNotes(cacheClass: CacheClass = "shortTtl", query?: CursorQuery) {
  const response = await fetchApiJson<TrendingNotesResponse>(nativeApiV1Routes.trendingNotes, {
    cacheClass,
    query: buildCursorQuery(query),
  });
  return {
    ...response,
    notes: normalizeEventRecords(response.notes),
  };
}

export async function getTrendingLongForm(
  cacheClass: CacheClass = "shortTtl",
  query?: OffsetQuery
): Promise<TrendingLongFormResponse> {
  const response = await fetchApiJson<TrendingLongFormApiResponse>(
    nativeApiV1Routes.trendingLongForm,
    {
      cacheClass,
      query: buildOffsetQuery(query),
    }
  );
  return normalizeTrendingLongFormResponse(response);
}

export async function getTrendingProfiles(
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
) {
  const response = await fetchApiJson<TrendingProfilesResponse>(
    nativeApiV1Routes.trendingProfiles,
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return {
    ...response,
    profiles: normalizeProfiles(response.profiles),
  };
}

export async function getHotConversations(
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
) {
  const response = await fetchApiJson<HotConversationsResponse>(
    nativeApiV1Routes.hotConversations,
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  const responseRecord = response as Record<string, unknown>;
  const notes = normalizeHotConversationNotes(
    response.notes ??
      responseRecord.conversations ??
      responseRecord.events ??
      responseRecord.notes ??
      responseRecord.items ??
      responseRecord.data
  );
  return {
    ...response,
    notes,
  } satisfies HotConversationsResponse;
}

export async function getRisingProfiles(cacheClass: CacheClass = "shortTtl", query?: CursorQuery) {
  const response = await fetchApiJson<RisingProfilesResponse>(nativeApiV1Routes.risingProfiles, {
    cacheClass,
    query: buildCursorQuery(query),
  });
  const responseRecord = response as Record<string, unknown>;
  return {
    ...response,
    profiles: normalizeProfiles(
      response.profiles ??
        responseRecord.rising_profiles ??
        responseRecord.users ??
        responseRecord.items ??
        responseRecord.data
    ),
  } satisfies RisingProfilesResponse;
}

export async function getTrendingHashtags(
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
) {
  const response = await fetchApiJson<TrendingHashtagsResponse>(
    nativeApiV1Routes.trendingHashtags,
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return {
    ...response,
    hashtags: normalizeHashtagEntries(response.hashtags),
  };
}

export async function getTrendingDomains(cacheClass: CacheClass = "shortTtl", query?: CursorQuery) {
  const response = await fetchApiJson<TrendingDomainsApiResponse>(
    nativeApiV1Routes.trendingDomains,
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return {
    ...response,
    domains: normalizeDomainEntries(
      response.domains ??
        (response as Record<string, unknown>).items ??
        (response as Record<string, unknown>).data
    ),
  } satisfies TrendingDomainsResponse;
}
