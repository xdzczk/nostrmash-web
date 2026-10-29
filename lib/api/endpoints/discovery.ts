import type {
  DiscoveryHomeResponse,
  HotConversationsResponse,
  RisingProfilesResponse,
  TrendingDomainsApiResponse,
  TrendingDomainsResponse,
  TrendingHashtagsResponse,
  TrendingLongFormApiResponse,
  TrendingLongFormResponse,
  TrendingMediaApiResponse,
  TrendingMediaResponse,
  TrendingNotesResponse,
  TrendingProfilesResponse,
  LiveActivitiesApiResponse,
  LiveActivitiesResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import {
  applyDomainTrendWindows,
  normalizeDiscoveryHomeResponse,
  normalizeDiscoveryLanguageFields,
  normalizeDomainEntries,
  normalizeEventRecords,
  normalizeHashtagEntries,
  normalizeProfiles,
  normalizeLiveActivitiesResponse,
  normalizeTrendingLongFormResponse,
  normalizeTrendingMediaResponse,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import {
  applyConversationReplyWindow,
  buildCursorQuery,
  buildOffsetQuery,
  type CursorQuery,
  type OffsetQuery,
  nativeApiV1Routes,
  normalizeHotConversationNotes,
} from "@/lib/api/endpoints/shared";
import { eventListResponseSchema, profileListResponseSchema } from "@/lib/api/schemas/core";

/** Home hashtag/domain sections share one ranking. 20 is the API maximum. */
export const HOME_INDEX_LIMIT = 20;

export type DiscoveryHomeQuery = {
  window?: string;
  hashtags_limit?: number;
  domains_limit?: number;
  notes_limit?: number;
  lang?: string;
};

export async function getDiscoveryHome(
  cacheClass: CacheClass = "shortTtl",
  query?: DiscoveryHomeQuery
) {
  const response = await fetchApiJson<DiscoveryHomeResponse>(nativeApiV1Routes.discoveryHome, {
    cacheClass,
    query: query
      ? {
          window: query.window,
          hashtags_limit: query.hashtags_limit,
          domains_limit: query.domains_limit,
          notes_limit: query.notes_limit,
          ...(query.lang ? { lang: query.lang } : {}),
        }
      : undefined,
  });
  return normalizeDiscoveryHomeResponse(response);
}
export async function getTrendingNotes(cacheClass: CacheClass = "shortTtl", query?: CursorQuery) {
  const response = await fetchApiJson<TrendingNotesResponse>(nativeApiV1Routes.trendingNotes, {
    cacheClass,
    query: buildCursorQuery(query),
    schema: eventListResponseSchema,
  });
  return normalizeDiscoveryLanguageFields({
    ...response,
    notes: normalizeEventRecords(response.notes),
  });
}

export async function getTrendingMedia(
  format: "pictures" | "videos" | "shorts",
  cacheClass: CacheClass = "shortTtl",
  query?: OffsetQuery
): Promise<TrendingMediaResponse> {
  const response = await fetchApiJson<TrendingMediaApiResponse>(nativeApiV1Routes.trendingMedia, {
    cacheClass,
    query: { ...buildOffsetQuery(query), format },
  });
  return normalizeTrendingMediaResponse(response);
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
      schema: profileListResponseSchema,
    }
  );
  return normalizeDiscoveryLanguageFields({
    ...response,
    profiles: normalizeProfiles(response.profiles),
  });
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
  const notes = applyConversationReplyWindow(
    normalizeHotConversationNotes(
      response.notes ??
        responseRecord.conversations ??
        responseRecord.events ??
        responseRecord.notes ??
        responseRecord.items ??
        responseRecord.data
    ),
    query?.window
  );
  return normalizeDiscoveryLanguageFields({
    ...response,
    notes,
  }) satisfies HotConversationsResponse;
}

export async function getRisingProfiles(cacheClass: CacheClass = "shortTtl", query?: CursorQuery) {
  const response = await fetchApiJson<RisingProfilesResponse>(nativeApiV1Routes.risingProfiles, {
    cacheClass,
    query: buildCursorQuery(query),
  });
  const responseRecord = response as Record<string, unknown>;
  return normalizeDiscoveryLanguageFields({
    ...response,
    profiles: normalizeProfiles(
      response.profiles ??
        responseRecord.rising_profiles ??
        responseRecord.users ??
        responseRecord.items ??
        responseRecord.data
    ),
  }) satisfies RisingProfilesResponse;
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
  return normalizeDiscoveryLanguageFields({
    ...response,
    hashtags: normalizeHashtagEntries(response.hashtags),
  });
}

export async function getTrendingDomains(cacheClass: CacheClass = "shortTtl", query?: CursorQuery) {
  const response = await fetchApiJson<TrendingDomainsApiResponse>(
    nativeApiV1Routes.trendingDomains,
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeDiscoveryLanguageFields({
    ...response,
    domains: applyDomainTrendWindows(
      normalizeDomainEntries(
        response.domains ??
          (response as Record<string, unknown>).items ??
          (response as Record<string, unknown>).data
      ),
      typeof response.window === "string" ? response.window : undefined
    ),
  }) satisfies TrendingDomainsResponse;
}

export async function getLiveActivities(
  status: "live" | "planned" | "ended" = "live",
  cacheClass: CacheClass = "shortTtl",
  options?: { limit?: number }
): Promise<LiveActivitiesResponse> {
  const response = await fetchApiJson<LiveActivitiesApiResponse>(nativeApiV1Routes.liveActivities, {
    cacheClass,
    query: { status, limit: options?.limit },
  });
  return normalizeLiveActivitiesResponse(response);
}
