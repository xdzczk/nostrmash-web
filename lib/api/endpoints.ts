import type {
  DiscoveryHomeResponse,
  EventDetailResponse,
  HashtagEntry,
  Profile,
  SearchResponse,
  StatsResponse,
  TrendingHashtagsResponse,
  TrendingNotesResponse,
  TrendingProfilesResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import {
  normalizeDiscoveryHomeResponse,
  normalizeEventRecords,
  normalizeHashtagEntries,
  normalizeNoteSummaryResponse,
  normalizeProfile,
  normalizeProfiles,
  normalizeProfileSummaryResponse,
  normalizeThreadResponse,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";

export interface SearchQuery {
  q: string;
  tab?: "all" | "notes" | "profiles";
  limit?: number;
  offset?: number;
  window?: "24h" | "7d" | "30d";
}

interface SearchNotesApiResponse {
  notes?: unknown[];
}

interface SearchProfilesApiResponse {
  profiles?: unknown[];
}

interface SearchSuggestApiResponse {
  profiles?: unknown[];
  hashtags?: HashtagEntry[];
}

interface BatchProfilesApiResponse {
  profiles?: unknown[];
}

interface ProfileApiResponse {
  [key: string]: unknown;
}

interface ProfileSummaryApiResponse {
  [key: string]: unknown;
}

interface ThreadApiResponse {
  [key: string]: unknown;
}

interface NoteSummaryApiResponse {
  [key: string]: unknown;
}

export async function getDiscoveryHome(cacheClass: CacheClass = "shortTtl") {
  const response = await fetchApiJson<DiscoveryHomeResponse>("/api/v1/discovery/home", {
    cacheClass,
  });
  return normalizeDiscoveryHomeResponse(response);
}

export async function getSearch(query: SearchQuery, cacheClass: CacheClass = "requestTime") {
  if (query.tab === "notes") {
    const notesResponse = await fetchApiJson<SearchNotesApiResponse>("/api/v1/search/notes", {
      cacheClass,
      query: {
        q: query.q,
        limit: query.limit,
        offset: query.offset,
        window: query.window === "24h" || query.window === "7d" ? query.window : undefined,
      },
    });
    const notes = normalizeEventRecords(notesResponse.notes);
    return {
      notes,
      profiles: [],
      hashtags: [],
      total: notes.length,
    } satisfies SearchResponse;
  }

  if (query.tab === "profiles") {
    const profilesResponse = await fetchApiJson<SearchProfilesApiResponse>(
      "/api/v1/search/profiles",
      {
        cacheClass,
        query: {
          q: query.q,
          limit: query.limit,
          offset: query.offset,
        },
      }
    );
    const profiles = normalizeProfiles(profilesResponse.profiles);
    return {
      notes: [],
      profiles,
      hashtags: [],
      total: profiles.length,
    } satisfies SearchResponse;
  }

  const [notesResult, profilesResult, suggestResult] = await Promise.allSettled([
    fetchApiJson<SearchNotesApiResponse>("/api/v1/search/notes", {
      cacheClass,
      query: {
        q: query.q,
        limit: query.limit,
        offset: query.offset,
        window: query.window === "24h" || query.window === "7d" ? query.window : undefined,
      },
    }),
    fetchApiJson<SearchProfilesApiResponse>("/api/v1/search/profiles", {
      cacheClass,
      query: {
        q: query.q,
        limit: query.limit,
        offset: query.offset,
      },
    }),
    fetchApiJson<SearchSuggestApiResponse>("/api/v1/search/suggest", {
      cacheClass,
      query: {
        q: query.q,
        limit: Math.min(query.limit ?? 20, 20),
      },
    }),
  ]);

  const notes =
    notesResult.status === "fulfilled" ? normalizeEventRecords(notesResult.value.notes) : [];
  const profiles =
    profilesResult.status === "fulfilled" ? normalizeProfiles(profilesResult.value.profiles) : [];
  const hashtags =
    suggestResult.status === "fulfilled"
      ? normalizeHashtagEntries(suggestResult.value.hashtags)
      : [];
  const errors = [notesResult, profilesResult, suggestResult]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => (result.reason instanceof Error ? result.reason.message : "Search failed."));

  if (errors.length === 3) {
    throw new Error(errors.join(" | "));
  }

  return {
    notes,
    profiles,
    hashtags,
    total: notes.length + profiles.length + hashtags.length,
    errors: errors.length > 0 ? errors : undefined,
  } satisfies SearchResponse;
}

export async function getProfile(pubkey: string, cacheClass: CacheClass = "requestTime") {
  const response = await fetchApiJson<ProfileApiResponse>(
    `/api/v1/profiles/${encodeURIComponent(pubkey)}`,
    {
      cacheClass,
    }
  );
  const profile = normalizeProfile(response);
  if (!profile) {
    throw new Error("API returned an invalid profile payload.");
  }
  return profile;
}

export async function getProfilesBatch(pubkeys: string[], cacheClass: CacheClass = "requestTime") {
  const normalizedPubkeys = Array.from(
    new Set(pubkeys.map((pubkey) => pubkey.trim()).filter((pubkey) => pubkey.length > 0))
  );

  if (normalizedPubkeys.length === 0) {
    return [] as Profile[];
  }

  const response = await fetchApiJson<BatchProfilesApiResponse>("/api/v1/profiles/batch", {
    cacheClass,
    init: {
      method: "POST",
      body: JSON.stringify({ pubkeys: normalizedPubkeys }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  });

  return normalizeProfiles(response.profiles);
}

export async function getProfileSummary(pubkey: string, cacheClass: CacheClass = "requestTime") {
  const response = await fetchApiJson<ProfileSummaryApiResponse>(
    `/api/v1/users/${encodeURIComponent(pubkey)}/summary`,
    { cacheClass }
  );
  return normalizeProfileSummaryResponse(response);
}

export async function getEvent(eventId: string, cacheClass: CacheClass = "requestTime") {
  return fetchApiJson<EventDetailResponse>(`/api/v1/events/${encodeURIComponent(eventId)}`, {
    cacheClass,
  });
}

export async function getThread(eventId: string, cacheClass: CacheClass = "requestTime") {
  const response = await fetchApiJson<ThreadApiResponse>(
    `/api/v1/threads/${encodeURIComponent(eventId)}`,
    {
      cacheClass,
    }
  );
  return normalizeThreadResponse(response);
}

export async function getNoteSummary(eventId: string, cacheClass: CacheClass = "requestTime") {
  const response = await fetchApiJson<NoteSummaryApiResponse>(
    `/api/v1/notes/${encodeURIComponent(eventId)}/summary`,
    {
      cacheClass,
    }
  );
  return normalizeNoteSummaryResponse(response);
}

export async function getTrendingNotes(cacheClass: CacheClass = "shortTtl") {
  const response = await fetchApiJson<TrendingNotesResponse>("/api/v1/discovery/notes/trending", {
    cacheClass,
  });
  return {
    ...response,
    notes: normalizeEventRecords(response.notes),
  };
}

export async function getTrendingProfiles(cacheClass: CacheClass = "shortTtl") {
  const response = await fetchApiJson<TrendingProfilesResponse>(
    "/api/v1/discovery/profiles/trending",
    {
      cacheClass,
    }
  );
  return {
    ...response,
    profiles: normalizeProfiles(response.profiles),
  };
}

export async function getTrendingHashtags(cacheClass: CacheClass = "shortTtl") {
  const response = await fetchApiJson<TrendingHashtagsResponse>(
    "/api/v1/discovery/hashtags/trending",
    {
      cacheClass,
    }
  );
  return {
    ...response,
    hashtags: normalizeHashtagEntries(response.hashtags),
  };
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
