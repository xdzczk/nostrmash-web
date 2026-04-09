import type {
  DiscoveryHomeResponse,
  EventDetailResponse,
  NoteSummaryResponse,
  Profile,
  ProfileSummaryResponse,
  SearchResponse,
  StatsResponse,
  ThreadResponse,
  TrendingHashtagsResponse,
  TrendingNotesResponse,
  TrendingProfilesResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import type { CacheClass } from "@/lib/caching/policies";

export interface SearchQuery {
  q: string;
  tab?: "all" | "notes" | "profiles";
  limit?: number;
  offset?: number;
  window?: "24h" | "7d" | "30d";
}

export async function getDiscoveryHome(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<DiscoveryHomeResponse>("/api/v1/discovery/home", { cacheClass });
}

export async function getSearch(query: SearchQuery, cacheClass: CacheClass = "requestTime") {
  return fetchApiJson<SearchResponse>("/api/v1/search", {
    cacheClass,
    query: {
      q: query.q,
      tab: query.tab,
      limit: query.limit,
      offset: query.offset,
      window: query.window,
    },
  });
}

export async function getProfile(pubkey: string, cacheClass: CacheClass = "requestTime") {
  return fetchApiJson<Profile>(`/api/v1/profiles/${encodeURIComponent(pubkey)}`, {
    cacheClass,
  });
}

export async function getProfileSummary(pubkey: string, cacheClass: CacheClass = "requestTime") {
  return fetchApiJson<ProfileSummaryResponse>(
    `/api/v1/users/${encodeURIComponent(pubkey)}/summary`,
    { cacheClass }
  );
}

export async function getEvent(eventId: string, cacheClass: CacheClass = "requestTime") {
  return fetchApiJson<EventDetailResponse>(`/api/v1/events/${encodeURIComponent(eventId)}`, {
    cacheClass,
  });
}

export async function getThread(eventId: string, cacheClass: CacheClass = "requestTime") {
  return fetchApiJson<ThreadResponse>(`/api/v1/threads/${encodeURIComponent(eventId)}`, {
    cacheClass,
  });
}

export async function getNoteSummary(eventId: string, cacheClass: CacheClass = "requestTime") {
  return fetchApiJson<NoteSummaryResponse>(`/api/v1/notes/${encodeURIComponent(eventId)}/summary`, {
    cacheClass,
  });
}

export async function getTrendingNotes(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<TrendingNotesResponse>("/api/v1/discovery/notes/trending", {
    cacheClass,
  });
}

export async function getTrendingProfiles(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<TrendingProfilesResponse>("/api/v1/discovery/profiles/trending", {
    cacheClass,
  });
}

export async function getTrendingHashtags(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<TrendingHashtagsResponse>("/api/v1/discovery/hashtags/trending", {
    cacheClass,
  });
}

export async function getNetworkStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>("/api/v1/discovery/stats/network", { cacheClass });
}

export async function getContentStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>("/api/v1/discovery/stats/content", { cacheClass });
}

export async function getRelayStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>("/api/v1/discovery/stats/relays", { cacheClass });
}
