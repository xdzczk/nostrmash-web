import type {
  BatchProfilesApiResponse,
  DiscoveryHomeResponse,
  EventCountsApiResponse,
  EventCountsResponse,
  EventDetailResponse,
  EventSeenOnApiResponse,
  EventSeenOnResponse,
  NoteSummaryApiResponse,
  Profile,
  ProfileApiResponse,
  ProfileSummaryApiResponse,
  SearchResponse,
  SearchApiResponse,
  SearchNotesApiResponse,
  SearchProfilesApiResponse,
  SearchSuggestApiResponse,
  StatsResponse,
  ThreadApiResponse,
  TrendingHashtagsResponse,
  TrendingNotesResponse,
  TrendingProfilesResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import {
  normalizeDiscoveryHomeResponse,
  normalizeEventCountsResponse,
  normalizeEventRecord,
  normalizeEventRecords,
  normalizeEventSeenOnResponse,
  extractNativeApiSemantics,
  normalizeHashtagEntries,
  normalizeNoteSummaryResponse,
  normalizeProfile,
  normalizeProfiles,
  normalizeProfileSummaryResponse,
  normalizeThreadResponse,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import { npubToHex } from "@/lib/nostr/npub";

export interface SearchQuery {
  q: string;
  tab?: "all" | "notes" | "profiles";
  limit?: number;
  cursor?: string;
}

const nativeApiV1Routes = {
  discoveryHome: "/api/v1/discovery/home",
  search: "/api/v1/search",
  searchNotes: "/api/v1/search/notes",
  searchProfiles: "/api/v1/search/profiles",
  searchSuggest: "/api/v1/search/suggest",
  profilesBatch: "/api/v1/profiles/batch",
  profileByPubkey: (pubkey: string) => `/api/v1/profiles/${encodeURIComponent(pubkey)}`,
  profileSummaryByPubkey: (pubkey: string) => `/api/v1/users/${encodeURIComponent(pubkey)}/summary`,
  eventById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}`,
  eventSeenOnById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}/seen-on`,
  eventCountsById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}/counts`,
  threadByEventId: (eventId: string) => `/api/v1/threads/${encodeURIComponent(eventId)}`,
  noteSummaryByEventId: (eventId: string) => `/api/v1/notes/${encodeURIComponent(eventId)}/summary`,
  trendingNotes: "/api/v1/discovery/notes/trending",
  trendingProfiles: "/api/v1/discovery/profiles/trending",
  trendingHashtags: "/api/v1/discovery/hashtags/trending",
  networkStats: "/api/v1/discovery/stats/network",
  contentStats: "/api/v1/discovery/stats/content",
  relayStats: "/api/v1/discovery/stats/relays",
} as const;

const normalizeSearchQueryText = (value: string): string =>
  value
    .trim()
    .replace(/^nostr:/i, "")
    .replace(/^@/, "");

const looksLikeProfileIdentifier = (value: string): boolean =>
  /^npub1[02-9ac-hj-np-z]+$/i.test(value) || /^[0-9a-f]{64}$/i.test(value);

const looksLikeEventIdentifier = (value: string): boolean => /^[0-9a-f]{64}$/i.test(value);

function toSearchCursor(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    for (const key of ["next_cursor", "cursor", "continuation", "next"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.length > 0) return candidate;
    }
  }
  return undefined;
}

function buildSearchQuery(
  query: Pick<SearchQuery, "q" | "limit" | "cursor">
): Record<string, string | number | undefined> {
  return {
    q: query.q,
    limit: query.limit,
    cursor: query.cursor,
  };
}

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

function buildSearchSectionTotals(
  notesCount: number,
  profilesCount: number,
  profileSuggestionsCount: number,
  hashtagsCount: number,
  relaysCount: number
): NonNullable<SearchResponse["section_totals"]> {
  return {
    notes: notesCount,
    profiles: profilesCount,
    profile_suggestions: profileSuggestionsCount,
    hashtags: hashtagsCount,
    relays: relaysCount,
  };
}

async function fetchSearchNotes(
  query: Pick<SearchQuery, "q" | "limit" | "cursor">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchNotesApiResponse>(nativeApiV1Routes.searchNotes, {
    cacheClass,
    query: buildSearchQuery(query),
  });
}

async function fetchSearchProfiles(
  query: Pick<SearchQuery, "q" | "limit" | "cursor">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchProfilesApiResponse>(nativeApiV1Routes.searchProfiles, {
    cacheClass,
    query: buildSearchQuery(query),
  });
}

async function fetchSearchSuggest(query: Pick<SearchQuery, "q" | "limit">, cacheClass: CacheClass) {
  return fetchApiJson<SearchSuggestApiResponse>(nativeApiV1Routes.searchSuggest, {
    cacheClass,
    query,
  });
}

async function fetchSearch(
  query: Pick<SearchQuery, "q" | "limit" | "cursor">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchApiResponse>(nativeApiV1Routes.search, {
    cacheClass,
    query: buildSearchQuery(query),
  });
}

export async function getDiscoveryHome(cacheClass: CacheClass = "shortTtl") {
  const response = await fetchApiJson<DiscoveryHomeResponse>(nativeApiV1Routes.discoveryHome, {
    cacheClass,
  });
  return normalizeDiscoveryHomeResponse(response);
}

export async function getSearch(
  query: SearchQuery,
  cacheClass: CacheClass = "requestTime"
): Promise<SearchResponse> {
  const normalizedQueryText = normalizeSearchQueryText(query.q);
  const searchQuery = {
    q: normalizedQueryText,
    limit: query.limit,
    cursor: query.cursor,
  } satisfies Pick<SearchQuery, "q" | "limit" | "cursor">;
  const dedupeProfiles = (profiles: Profile[]): Profile[] =>
    Array.from(
      new Map(
        profiles
          .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
          .map((profile) => [profile.pubkey, profile])
      ).values()
    );

  if (query.tab === "notes") {
    const notesResponse = await fetchSearchNotes(searchQuery, cacheClass);
    const notes = normalizeEventRecords(notesResponse.notes);
    let directNoteMatch = [] as NonNullable<SearchResponse["notes"]>;
    if (notes.length === 0 && looksLikeEventIdentifier(normalizedQueryText)) {
      try {
        const eventResponse = await getEvent(normalizedQueryText, cacheClass);
        const directEvent = normalizeEventRecord(eventResponse.event ?? eventResponse);
        directNoteMatch = directEvent ? [directEvent] : [];
      } catch {
        directNoteMatch = [];
      }
    }
    const mergedNotes = Array.from(
      new Map([...notes, ...directNoteMatch].map((note) => [note.id, note])).values()
    );
    const sectionTotals = buildSearchSectionTotals(mergedNotes.length, 0, 0, 0, 0);
    const semantics = extractNativeApiSemantics(notesResponse);
    const notesCursor = toSearchCursor(notesResponse);
    return {
      ...semantics,
      ...notesResponse,
      notes: mergedNotes,
      profiles: [],
      profile_suggestions: [],
      hashtags: [],
      relays: [],
      next_cursor: notesCursor ?? semantics.next_cursor,
      surface_cursors: notesCursor ? { notes: notesCursor } : undefined,
      total: typeof notesResponse.total === "number" ? notesResponse.total : mergedNotes.length,
      section_totals: {
        ...sectionTotals,
        ...(notesResponse.section_totals ?? {}),
      },
    } satisfies SearchResponse;
  }

  if (query.tab === "profiles") {
    const profilesResponse = await fetchSearchProfiles(searchQuery, cacheClass);
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

  const [
    searchResult,
    notesResult,
    profilesResult,
    suggestResult,
    directProfileResult,
    directNoteResult,
  ] = await Promise.allSettled([
    fetchSearch(searchQuery, cacheClass),
    fetchSearchNotes(
      {
        q: normalizedQueryText,
        limit: query.limit,
        cursor: query.cursor,
      },
      cacheClass
    ),
    fetchSearchProfiles(
      {
        q: normalizedQueryText,
        limit: query.limit,
        cursor: query.cursor,
      },
      cacheClass
    ),
    fetchSearchSuggest(
      {
        q: normalizedQueryText,
        limit: Math.min(query.limit ?? 20, 20),
      },
      cacheClass
    ),
    looksLikeProfileIdentifier(normalizedQueryText)
      ? getProfile(normalizedQueryText, cacheClass)
      : Promise.resolve(null),
    looksLikeEventIdentifier(normalizedQueryText)
      ? getEvent(normalizedQueryText, cacheClass)
      : Promise.resolve(null),
  ]);

  const notesFromSearch =
    searchResult.status === "fulfilled" ? normalizeEventRecords(searchResult.value.notes) : [];
  const notesFromNotesSurface =
    notesResult.status === "fulfilled" ? normalizeEventRecords(notesResult.value.notes) : [];
  const directNoteMatch =
    directNoteResult.status === "fulfilled" && directNoteResult.value
      ? (() => {
          const normalized = normalizeEventRecord(
            directNoteResult.value.event ?? directNoteResult.value
          );
          return normalized ? [normalized] : [];
        })()
      : [];
  const notes = Array.from(
    new Map(
      [
        ...(notesFromNotesSurface.length > 0 ? notesFromNotesSurface : notesFromSearch),
        ...directNoteMatch,
      ].map((note) => [note.id, note])
    ).values()
  );

  const profilesFromSearch =
    searchResult.status === "fulfilled" ? normalizeProfiles(searchResult.value.profiles) : [];
  const profilesFromProfilesSurface =
    profilesResult.status === "fulfilled" ? normalizeProfiles(profilesResult.value.profiles) : [];
  const profiles = dedupeProfiles(
    profilesFromProfilesSurface.length > 0 ? profilesFromProfilesSurface : profilesFromSearch
  );
  const profileSuggestions =
    suggestResult.status === "fulfilled"
      ? normalizeProfiles(suggestResult.value.profiles ?? suggestResult.value.suggested_profiles)
      : searchResult.status === "fulfilled"
        ? normalizeProfiles(searchResult.value.profile_suggestions)
        : [];
  const hashtags =
    suggestResult.status === "fulfilled"
      ? normalizeHashtagEntries(
          suggestResult.value.hashtags ?? suggestResult.value.suggested_hashtags
        )
      : searchResult.status === "fulfilled"
        ? normalizeHashtagEntries(searchResult.value.hashtags)
        : [];
  const relays =
    suggestResult.status === "fulfilled"
      ? normalizeRelayHints(suggestResult.value.relays)
      : searchResult.status === "fulfilled"
        ? normalizeRelayHints(searchResult.value.relays)
        : [];
  const directProfileMatch =
    directProfileResult.status === "fulfilled" && directProfileResult.value
      ? [directProfileResult.value]
      : [];
  const mergedProfiles = dedupeProfiles([...profiles, ...directProfileMatch]);
  const uniqueSuggestions = dedupeProfiles(profileSuggestions);

  const surfaceErrors: NonNullable<SearchResponse["surface_errors"]> = {};
  if (searchResult.status === "rejected") {
    surfaceErrors.search =
      searchResult.reason instanceof Error ? searchResult.reason.message : "Search failed.";
  }
  if (notesResult.status === "rejected") {
    surfaceErrors.notes =
      notesResult.reason instanceof Error ? notesResult.reason.message : "Notes search failed.";
  }
  if (profilesResult.status === "rejected") {
    surfaceErrors.profiles =
      profilesResult.reason instanceof Error
        ? profilesResult.reason.message
        : "Profiles search failed.";
  }
  if (suggestResult.status === "rejected") {
    surfaceErrors.suggest =
      suggestResult.reason instanceof Error ? suggestResult.reason.message : "Suggest failed.";
  }

  if (
    searchResult.status === "rejected" &&
    notesResult.status === "rejected" &&
    profilesResult.status === "rejected" &&
    suggestResult.status === "rejected"
  ) {
    throw new Error(
      Object.values(surfaceErrors).join(" | ") || "All search surfaces failed for this query."
    );
  }

  const sourceSectionTotals = [searchResult, notesResult, profilesResult, suggestResult]
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<{ section_totals?: SearchResponse["section_totals"] }> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value.section_totals)
    .find((entry) => entry !== undefined);

  const semantics = extractNativeApiSemantics(
    searchResult.status === "fulfilled" ? searchResult.value : undefined,
    notesResult.status === "fulfilled" ? notesResult.value : undefined,
    profilesResult.status === "fulfilled" ? profilesResult.value : undefined,
    suggestResult.status === "fulfilled" ? suggestResult.value : undefined
  );
  const surfaceCursors = {
    search: searchResult.status === "fulfilled" ? toSearchCursor(searchResult.value) : undefined,
    notes: notesResult.status === "fulfilled" ? toSearchCursor(notesResult.value) : undefined,
    profiles:
      profilesResult.status === "fulfilled" ? toSearchCursor(profilesResult.value) : undefined,
    suggest: suggestResult.status === "fulfilled" ? toSearchCursor(suggestResult.value) : undefined,
  } satisfies NonNullable<SearchResponse["surface_cursors"]>;
  const sectionTotals = buildSearchSectionTotals(
    notes.length,
    mergedProfiles.length,
    uniqueSuggestions.length,
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
    profiles: mergedProfiles,
    profile_suggestions: uniqueSuggestions,
    hashtags,
    relays,
    next_cursor: nextCursor,
    surface_errors: Object.keys(surfaceErrors).length > 0 ? surfaceErrors : undefined,
    surface_cursors: Object.values(surfaceCursors).some((value) => typeof value === "string")
      ? surfaceCursors
      : undefined,
    total:
      searchResult.status === "fulfilled" && typeof searchResult.value.total === "number"
        ? searchResult.value.total
        : notes.length + mergedProfiles.length + hashtags.length + relays.length,
    section_totals: {
      ...sectionTotals,
      ...(sourceSectionTotals ?? {}),
    },
    errors: errors.length > 0 ? errors : undefined,
  } satisfies SearchResponse;
}

export async function getProfile(pubkey: string, cacheClass: CacheClass = "requestTime") {
  const normalized = pubkey.trim().replace(/^nostr:/i, "");
  const decodedHex = normalized.toLowerCase().startsWith("npub1") ? npubToHex(normalized) : null;
  const candidates = Array.from(
    new Set(
      [normalized, decodedHex].filter(
        (candidate): candidate is string => typeof candidate === "string"
      )
    )
  );
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<ProfileApiResponse>(
        nativeApiV1Routes.profileByPubkey(candidate),
        {
          cacheClass,
        }
      );
      const profile = normalizeProfile(response);
      if (profile) {
        return profile;
      }
      lastError = new Error("API returned an invalid profile payload.");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Profile lookup failed.");
    }
  }

  throw lastError ?? new Error("Profile lookup failed.");
}

export async function getProfilesBatch(pubkeys: string[], cacheClass: CacheClass = "requestTime") {
  const normalizedPubkeys = Array.from(
    new Set(pubkeys.map((pubkey) => pubkey.trim()).filter((pubkey) => pubkey.length > 0))
  );

  if (normalizedPubkeys.length === 0) {
    return [] as Profile[];
  }

  const response = await fetchApiJson<BatchProfilesApiResponse>(nativeApiV1Routes.profilesBatch, {
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
  const normalized = pubkey.trim().replace(/^nostr:/i, "");
  const decodedHex = normalized.toLowerCase().startsWith("npub1") ? npubToHex(normalized) : null;
  const candidates = Array.from(
    new Set(
      [normalized, decodedHex].filter(
        (candidate): candidate is string => typeof candidate === "string"
      )
    )
  );
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<ProfileSummaryApiResponse>(
        nativeApiV1Routes.profileSummaryByPubkey(candidate),
        { cacheClass }
      );
      return normalizeProfileSummaryResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Profile summary lookup failed.");
    }
  }

  throw lastError ?? new Error("Profile summary lookup failed.");
}

export async function getEvent(eventId: string, cacheClass: CacheClass = "requestTime") {
  return fetchApiJson<EventDetailResponse>(nativeApiV1Routes.eventById(eventId), {
    cacheClass,
  });
}

export async function getEventSeenOn(
  eventId: string,
  cacheClass: CacheClass = "requestTime"
): Promise<EventSeenOnResponse> {
  const response = await fetchApiJson<EventSeenOnApiResponse>(
    nativeApiV1Routes.eventSeenOnById(eventId),
    {
      cacheClass,
    }
  );
  return normalizeEventSeenOnResponse(response);
}

export async function getEventCounts(
  eventId: string,
  cacheClass: CacheClass = "requestTime"
): Promise<EventCountsResponse> {
  const response = await fetchApiJson<EventCountsApiResponse>(
    nativeApiV1Routes.eventCountsById(eventId),
    {
      cacheClass,
    }
  );
  return normalizeEventCountsResponse(response);
}

export async function getThread(eventId: string, cacheClass: CacheClass = "requestTime") {
  const response = await fetchApiJson<ThreadApiResponse>(
    nativeApiV1Routes.threadByEventId(eventId),
    {
      cacheClass,
    }
  );
  return normalizeThreadResponse(response);
}

export async function getNoteSummary(eventId: string, cacheClass: CacheClass = "requestTime") {
  const response = await fetchApiJson<NoteSummaryApiResponse>(
    nativeApiV1Routes.noteSummaryByEventId(eventId),
    {
      cacheClass,
    }
  );
  return normalizeNoteSummaryResponse(response);
}

export async function getTrendingNotes(cacheClass: CacheClass = "shortTtl") {
  const response = await fetchApiJson<TrendingNotesResponse>(nativeApiV1Routes.trendingNotes, {
    cacheClass,
  });
  return {
    ...response,
    notes: normalizeEventRecords(response.notes),
  };
}

export async function getTrendingProfiles(cacheClass: CacheClass = "shortTtl") {
  const response = await fetchApiJson<TrendingProfilesResponse>(
    nativeApiV1Routes.trendingProfiles,
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
    nativeApiV1Routes.trendingHashtags,
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
  return fetchApiJson<StatsResponse>(nativeApiV1Routes.networkStats, { cacheClass });
}

export async function getContentStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>(nativeApiV1Routes.contentStats, { cacheClass });
}

export async function getRelayStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>(nativeApiV1Routes.relayStats, { cacheClass });
}
