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
  relays?: unknown[];
  suggested_profiles?: unknown[];
  suggested_hashtags?: HashtagEntry[];
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
  const normalizeSearchQueryText = (value: string): string =>
    value
      .trim()
      .replace(/^nostr:/i, "")
      .replace(/^@/, "");
  const looksLikeProfileIdentifier = (value: string): boolean =>
    /^npub1[02-9ac-hj-np-z]+$/i.test(value) || /^[0-9a-f]{64}$/i.test(value);
  const normalizeRelayHints = (value: unknown): string[] =>
    (Array.isArray(value) ? value : [])
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (typeof entry === "object" && entry !== null) {
          const record = entry as Record<string, unknown>;
          for (const key of ["relay_url", "url", "host", "relay", "name"]) {
            const relay = record[key];
            if (typeof relay === "string" && relay.trim().length > 0) {
              return relay.trim();
            }
          }
        }
        return "";
      })
      .filter((relay) => relay.length > 0);

  if (query.tab === "notes") {
    const normalizedQueryText = normalizeSearchQueryText(query.q);
    const notesResponse = await fetchApiJson<SearchNotesApiResponse>("/api/v1/search/notes", {
      cacheClass,
      query: {
        q: normalizedQueryText,
        limit: query.limit,
        offset: query.offset,
        window: query.window,
      },
    });
    const notes = normalizeEventRecords(notesResponse.notes);
    return {
      notes,
      profiles: [],
      profile_suggestions: [],
      hashtags: [],
      relays: [],
      total: notes.length,
      section_totals: {
        notes: notes.length,
        profiles: 0,
        profile_suggestions: 0,
        hashtags: 0,
        relays: 0,
      },
    } satisfies SearchResponse;
  }

  if (query.tab === "profiles") {
    const normalizedQueryText = normalizeSearchQueryText(query.q);
    const profilesResponse = await fetchApiJson<SearchProfilesApiResponse>(
      "/api/v1/search/profiles",
      {
        cacheClass,
        query: {
          q: normalizedQueryText,
          limit: query.limit,
          offset: query.offset,
        },
      }
    );
    const profiles = normalizeProfiles(profilesResponse.profiles);
    let directProfileMatch: Profile[] = [];
    if (profiles.length === 0 && looksLikeProfileIdentifier(normalizedQueryText)) {
      try {
        const profile = await getProfile(normalizedQueryText, cacheClass);
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
    return {
      notes: [],
      profiles: mergedProfiles,
      profile_suggestions: [],
      hashtags: [],
      relays: [],
      total: mergedProfiles.length,
      section_totals: {
        notes: 0,
        profiles: mergedProfiles.length,
        profile_suggestions: 0,
        hashtags: 0,
        relays: 0,
      },
    } satisfies SearchResponse;
  }

  const normalizedQueryText = normalizeSearchQueryText(query.q);
  const [notesResult, profilesResult, suggestResult, directProfileResult] =
    await Promise.allSettled([
      fetchApiJson<SearchNotesApiResponse>("/api/v1/search/notes", {
        cacheClass,
        query: {
          q: normalizedQueryText,
          limit: query.limit,
          offset: query.offset,
          window: query.window,
        },
      }),
      fetchApiJson<SearchProfilesApiResponse>("/api/v1/search/profiles", {
        cacheClass,
        query: {
          q: normalizedQueryText,
          limit: query.limit,
          offset: query.offset,
        },
      }),
      fetchApiJson<SearchSuggestApiResponse>("/api/v1/search/suggest", {
        cacheClass,
        query: {
          q: normalizedQueryText,
          limit: Math.min(query.limit ?? 20, 20),
        },
      }),
      looksLikeProfileIdentifier(normalizedQueryText)
        ? getProfile(normalizedQueryText, cacheClass)
        : Promise.reject(new Error("Direct profile lookup skipped.")),
    ]);

  const notes =
    notesResult.status === "fulfilled" ? normalizeEventRecords(notesResult.value.notes) : [];
  const profiles =
    profilesResult.status === "fulfilled" ? normalizeProfiles(profilesResult.value.profiles) : [];
  const profileSuggestions =
    suggestResult.status === "fulfilled"
      ? normalizeProfiles(suggestResult.value.profiles ?? suggestResult.value.suggested_profiles)
      : [];
  const hashtags =
    suggestResult.status === "fulfilled"
      ? normalizeHashtagEntries(
          suggestResult.value.hashtags ?? suggestResult.value.suggested_hashtags
        )
      : [];
  const relays =
    suggestResult.status === "fulfilled" ? normalizeRelayHints(suggestResult.value.relays) : [];
  const directProfileMatch =
    directProfileResult.status === "fulfilled" ? [directProfileResult.value] : [];
  const uniqueProfiles = Array.from(
    new Map(
      [...profileSuggestions, ...profiles, ...directProfileMatch]
        .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
        .map((profile) => [profile.pubkey, profile])
    ).values()
  );
  const errors = [notesResult, profilesResult, suggestResult]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => (result.reason instanceof Error ? result.reason.message : "Search failed."));

  if (errors.length === 3) {
    throw new Error(errors.join(" | "));
  }

  return {
    notes,
    profiles: uniqueProfiles,
    profile_suggestions: profileSuggestions,
    hashtags,
    relays,
    total: notes.length + uniqueProfiles.length + hashtags.length + relays.length,
    section_totals: {
      notes: notes.length,
      profiles: uniqueProfiles.length,
      profile_suggestions: profileSuggestions.length,
      hashtags: hashtags.length,
      relays: relays.length,
    },
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
