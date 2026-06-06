import type {
  AuthorAnalyticsApiResponse,
  AuthorAnalyticsResponse,
  AuthorEventsApiResponse,
  AuthorEventsResponse,
  AuthorReactionsApiResponse,
  AuthorReactionsResponse,
  AuthorRepliesApiResponse,
  AuthorRepliesResponse,
  AuthorZapsApiResponse,
  AuthorZapsResponse,
  BatchProfilesApiResponse,
  ContactListContextApiResponse,
  ContactListContextResponse,
  DiscoveryHomeResponse,
  DomainDetailApiResponse,
  DomainDetailResponse,
  DomainNotesApiResponse,
  DomainNotesResponse,
  EventAncestorsApiResponse,
  EventAncestorsResponse,
  EventCountsApiResponse,
  EventCountsResponse,
  EventDetailResponse,
  EventRepliesApiResponse,
  EventRepliesResponse,
  EventSeenOnApiResponse,
  EventSeenOnResponse,
  HotConversationsResponse,
  HashtagDetailApiResponse,
  HashtagDetailResponse,
  HashtagNotesApiResponse,
  HashtagNotesResponse,
  NoteSummaryApiResponse,
  Profile,
  ProfileApiResponse,
  ProfileFollowersApiResponse,
  ProfileFollowersResponse,
  ProfileMentionsApiResponse,
  ProfileMentionsResponse,
  ProfileSummaryApiResponse,
  ProfileTopicsApiResponse,
  ProfileTopicsResponse,
  RelatedProfilesApiResponse,
  RelatedProfilesResponse,
  RelayListContextApiResponse,
  RelayListContextResponse,
  RelayHealthApiResponse,
  RelayHealthResponse,
  RelatedHashtagsApiResponse,
  RelatedHashtagsResponse,
  RelatedNotesApiResponse,
  RelatedNotesResponse,
  SearchResponse,
  SearchApiResponse,
  SearchNotesApiResponse,
  SearchProfilesApiResponse,
  SearchSuggestApiResponse,
  StatsResponse,
  RisingProfilesResponse,
  ThreadActivityApiResponse,
  ThreadActivityResponse,
  ThreadApiResponse,
  ThreadSummaryApiResponse,
  ThreadSummaryResponse,
  TrendingDomainsApiResponse,
  TrendingDomainsResponse,
  TrendingHashtagsResponse,
  TrendingNotesResponse,
  TrendingProfilesResponse,
  TrustScoreApiResponse,
  TrustScoreResponse,
  PopularRelaysResponse,
  RelayProbeHealthResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import {
  normalizeDiscoveryHomeResponse,
  normalizeEventCountsResponse,
  normalizeEventAncestorsResponse,
  normalizeEventRepliesResponse,
  normalizeEventRecord,
  normalizeEventRecords,
  normalizeEventSeenOnResponse,
  normalizeDomainDetailResponse,
  normalizeDomainEntries,
  normalizeDomainNotesResponse,
  normalizeHashtagDetailResponse,
  normalizeHashtagNotesResponse,
  normalizeRelatedHashtagsResponse,
  extractNativeApiSemantics,
  normalizeHashtagEntries,
  normalizeNoteSummaryResponse,
  normalizeAuthorEventsResponse,
  normalizeAuthorAnalyticsResponse,
  normalizeAuthorReactionsResponse,
  normalizeAuthorRepliesResponse,
  normalizeAuthorZapsResponse,
  normalizeContactListContextResponse,
  normalizeProfile,
  normalizeProfileFollowersResponse,
  normalizeProfileMentionsResponse,
  normalizeProfiles,
  normalizeProfileSummaryResponse,
  normalizeProfileTopicsResponse,
  normalizeRelatedProfilesResponse,
  normalizeRelayListContextResponse,
  normalizeRelayHealthResponse,
  normalizeRelatedNotesResponse,
  normalizeThreadActivityResponse,
  normalizeThreadResponse,
  normalizeThreadSummaryResponse,
  normalizeTrustScoreResponse,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import { npubToHex } from "@/lib/nostr/npub";

export interface SearchQuery {
  q: string;
  tab?: "all" | "notes" | "profiles";
  limit?: number;
  offset?: number;
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
  profileFollowersByPubkey: (pubkey: string) =>
    `/api/v1/users/${encodeURIComponent(pubkey)}/followers`,
  profileMentionsByPubkey: (pubkey: string) =>
    `/api/v1/users/${encodeURIComponent(pubkey)}/mentions`,
  contactListByPubkey: (pubkey: string) => `/api/v1/contact-lists/${encodeURIComponent(pubkey)}`,
  relayListByPubkey: (pubkey: string) => `/api/v1/relay-lists/${encodeURIComponent(pubkey)}`,
  relatedProfilesByPubkey: (pubkey: string) =>
    `/api/v1/discovery/profiles/${encodeURIComponent(pubkey)}/related`,
  profileTopicsByPubkey: (pubkey: string) =>
    `/api/v1/profiles/${encodeURIComponent(pubkey)}/topics`,
  authorEventsByPubkey: (pubkey: string) => `/api/v1/authors/${encodeURIComponent(pubkey)}/events`,
  authorRepliesByPubkey: (pubkey: string) =>
    `/api/v1/authors/${encodeURIComponent(pubkey)}/replies`,
  authorReactionsByPubkey: (pubkey: string) =>
    `/api/v1/authors/${encodeURIComponent(pubkey)}/reactions`,
  authorZapsByPubkey: (pubkey: string) => `/api/v1/authors/${encodeURIComponent(pubkey)}/zaps`,
  profileZapsByPubkey: (pubkey: string) => `/api/v1/users/${encodeURIComponent(pubkey)}/zaps`,
  authorAnalyticsActivityByPubkey: (pubkey: string) =>
    `/api/v1/authors/${encodeURIComponent(pubkey)}/analytics/activity`,
  authorAnalyticsBehaviorByPubkey: (pubkey: string) =>
    `/api/v1/authors/${encodeURIComponent(pubkey)}/analytics/behavior`,
  authorAnalyticsPostingBehaviorByPubkey: (pubkey: string) =>
    `/api/v1/authors/${encodeURIComponent(pubkey)}/analytics/posting-behavior`,
  trustScoreByPubkey: (pubkey: string) => `/api/v1/trust/scores/${encodeURIComponent(pubkey)}`,
  eventById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}`,
  eventAncestorsById: (eventId: string) =>
    `/api/v1/events/${encodeURIComponent(eventId)}/ancestors`,
  eventRepliesById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}/replies`,
  eventSeenOnById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}/seen-on`,
  eventCountsById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}/counts`,
  threadByEventId: (eventId: string) => `/api/v1/threads/${encodeURIComponent(eventId)}`,
  threadSummaryByRootEventId: (rootEventId: string) =>
    `/api/v1/threads/${encodeURIComponent(rootEventId)}/summary`,
  threadActivityByRootEventId: (rootEventId: string) =>
    `/api/v1/threads/${encodeURIComponent(rootEventId)}/activity`,
  noteSummaryByEventId: (eventId: string) => `/api/v1/notes/${encodeURIComponent(eventId)}/summary`,
  noteRelatedByEventId: (eventId: string) => `/api/v1/notes/${encodeURIComponent(eventId)}/related`,
  trendingNotes: "/api/v1/discovery/notes/trending",
  trendingProfiles: "/api/v1/discovery/profiles/trending",
  hotConversations: "/api/v1/discovery/conversations/hot",
  risingProfiles: "/api/v1/discovery/profiles/rising",
  trendingHashtags: "/api/v1/discovery/hashtags/trending",
  trendingDomains: "/api/v1/discovery/domains/trending",
  hashtagByName: (hashtag: string) => `/api/v1/discovery/hashtags/${encodeURIComponent(hashtag)}`,
  hashtagNotesByName: (hashtag: string) =>
    `/api/v1/discovery/hashtags/${encodeURIComponent(hashtag)}/notes`,
  hashtagRelatedByName: (hashtag: string) =>
    `/api/v1/discovery/hashtags/${encodeURIComponent(hashtag)}/related`,
  domainByName: (domain: string) => `/api/v1/discovery/domains/${encodeURIComponent(domain)}`,
  domainNotesByName: (domain: string) =>
    `/api/v1/discovery/domains/${encodeURIComponent(domain)}/notes`,
  networkStats: "/api/v1/discovery/stats/network",
  contentStats: "/api/v1/discovery/stats/content",
  relayStats: "/api/v1/discovery/stats/relays",
  relayHealth: "/api/v1/relays/health",
  relayPopular: "/api/v1/relays/popular",
  relayProbeHealth: "/api/v1/relays/probe-health",
} as const;

interface CursorQuery {
  cursor?: string;
  limit?: number;
  direction?: string;
  kind?: number;
}

function isApiNotFound(error: unknown): boolean {
  return error instanceof Error && /API 404:/i.test(error.message);
}

const normalizeSearchQueryText = (value: string): string =>
  value
    .trim()
    .replace(/^nostr:/i, "")
    .replace(/^@/, "");

const normalizeProfileSearchQueryText = (value: string): string => {
  const normalized = normalizeSearchQueryText(value);
  if (!normalized.toLowerCase().startsWith("npub1")) return normalized;
  return npubToHex(normalized) ?? normalized;
};

const looksLikeProfileIdentifier = (value: string): boolean =>
  /^npub1[02-9ac-hj-np-z]+$/i.test(value) || /^[0-9a-f]{64}$/i.test(value);

const looksLikeEventIdentifier = (value: string): boolean => /^[0-9a-f]{64}$/i.test(value);

function buildPubkeyCandidates(pubkey: string): string[] {
  const normalized = pubkey.trim().replace(/^nostr:/i, "");
  const decodedHex = normalized.toLowerCase().startsWith("npub1") ? npubToHex(normalized) : null;
  return Array.from(
    new Set(
      [normalized, decodedHex].filter(
        (candidate): candidate is string => typeof candidate === "string"
      )
    )
  );
}

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
  query: Pick<SearchQuery, "q" | "limit" | "offset">
): Record<string, string | number | undefined> {
  return {
    q: query.q,
    limit: query.limit,
    offset: query.offset,
  };
}

function normalizeHashtagQuery(hashtag: string): string {
  return hashtag.trim().replace(/^#/, "");
}

function normalizeDomainQuery(domain: string): string {
  const normalized = domain.trim().toLowerCase();
  if (normalized.length === 0) return "";
  const candidate = normalized.includes("://") ? normalized : `https://${normalized}`;
  try {
    return new URL(candidate).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    const hostname = normalized
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    return (hostname ?? "").replace(/\.$/, "");
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHotConversationNotes(value: unknown): ReturnType<typeof normalizeEventRecords> {
  const normalizedDirect = normalizeEventRecords(value).filter((note) => note.id.length > 0);
  if (normalizedDirect.length > 0) return normalizedDirect;
  if (!Array.isArray(value)) return [];

  const expanded = value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const candidate =
        entry.note ??
        entry.event ??
        entry.root ??
        entry.root_note ??
        entry.latest ??
        entry.last_event ??
        entry;
      if (isRecord(candidate)) {
        return normalizeEventRecord({
          ...candidate,
          id: candidate.id ?? entry.root_event_id ?? entry.event_id ?? entry.id,
          event_id: candidate.event_id ?? entry.root_event_id ?? entry.event_id,
          pubkey: candidate.pubkey ?? entry.pubkey ?? entry.author_pubkey,
        });
      }
      return normalizeEventRecord(candidate);
    })
    .filter((note): note is NonNullable<ReturnType<typeof normalizeEventRecord>> => note !== null)
    .filter((note) => note.id.length > 0);

  return Array.from(new Map(expanded.map((note) => [note.id, note])).values());
}

async function fetchSearchNotes(
  query: Pick<SearchQuery, "q" | "limit" | "offset">,
  cacheClass: CacheClass
) {
  return fetchApiJson<SearchNotesApiResponse>(nativeApiV1Routes.searchNotes, {
    cacheClass,
    query: buildSearchQuery(query),
  });
}

async function fetchSearchProfiles(
  query: Pick<SearchQuery, "q" | "limit" | "offset">,
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

async function fetchSearch(query: Pick<SearchQuery, "q" | "limit">, cacheClass: CacheClass) {
  return fetchApiJson<SearchApiResponse>(nativeApiV1Routes.search, {
    cacheClass,
    query,
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
  const normalizedProfileQueryText = normalizeProfileSearchQueryText(query.q);
  const searchQuery = {
    q: normalizedQueryText,
    limit: query.limit,
    offset: query.offset,
  } satisfies Pick<SearchQuery, "q" | "limit" | "offset">;
  const profileSearchQuery = {
    q: normalizedProfileQueryText,
    limit: query.limit,
    offset: query.offset,
  } satisfies Pick<SearchQuery, "q" | "limit" | "offset">;
  const combinedSearchQuery = {
    q: normalizedQueryText,
    limit: query.limit,
  } satisfies Pick<SearchQuery, "q" | "limit">;
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
    const currentOffset =
      typeof notesResponse.offset === "number" ? notesResponse.offset : (query.offset ?? 0);
    const nextOffset =
      typeof query.limit === "number" && notes.length >= query.limit
        ? currentOffset + notes.length
        : undefined;
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
      offset: currentOffset,
      next_offset: nextOffset,
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

  const [
    searchResult,
    notesResult,
    profilesResult,
    suggestResult,
    directProfileResult,
    directNoteResult,
  ] = await Promise.allSettled([
    fetchSearch(combinedSearchQuery, cacheClass),
    fetchSearchNotes(
      {
        q: normalizedQueryText,
        limit: query.limit,
        offset: 0,
      },
      cacheClass
    ),
    fetchSearchProfiles(
      {
        q: normalizedProfileQueryText,
        limit: query.limit,
        offset: 0,
      },
      cacheClass
    ),
    fetchSearchSuggest(
      {
        q: normalizedProfileQueryText,
        limit: Math.min(query.limit ?? 20, 20),
      },
      cacheClass
    ),
    looksLikeProfileIdentifier(normalizedProfileQueryText)
      ? getProfile(normalizedProfileQueryText, cacheClass)
      : Promise.resolve(null),
    looksLikeEventIdentifier(normalizedQueryText)
      ? getEvent(normalizedQueryText, cacheClass)
      : Promise.resolve(null),
  ]);

  const notesFromSearch =
    searchResult.status === "fulfilled"
      ? normalizeEventRecords(searchResult.value.notes ?? searchResult.value.events)
      : [];
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
  const promotedSuggestions =
    mergedProfiles.length === 0 && directProfileMatch.length === 0 ? uniqueSuggestions : [];
  const effectiveProfiles = dedupeProfiles([...mergedProfiles, ...promotedSuggestions]);
  const remainingSuggestions =
    promotedSuggestions.length === 0
      ? uniqueSuggestions
      : uniqueSuggestions.filter(
          (profile) => !effectiveProfiles.some((candidate) => candidate.pubkey === profile.pubkey)
        );

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
  const surfaceOffsets = {
    notes:
      notesResult.status === "fulfilled" &&
      typeof query.limit === "number" &&
      notesFromNotesSurface.length >= query.limit
        ? notesFromNotesSurface.length
        : undefined,
    profiles:
      profilesResult.status === "fulfilled" &&
      typeof query.limit === "number" &&
      profilesFromProfilesSurface.length >= query.limit
        ? profilesFromProfilesSurface.length
        : undefined,
  } satisfies NonNullable<SearchResponse["surface_offsets"]>;
  const sectionTotals = buildSearchSectionTotals(
    notes.length,
    effectiveProfiles.length,
    remainingSuggestions.length,
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
    profiles: effectiveProfiles,
    profile_suggestions: remainingSuggestions,
    hashtags,
    relays,
    next_cursor: nextCursor,
    surface_errors: Object.keys(surfaceErrors).length > 0 ? surfaceErrors : undefined,
    surface_cursors: Object.values(surfaceCursors).some((value) => typeof value === "string")
      ? surfaceCursors
      : undefined,
    surface_offsets: Object.values(surfaceOffsets).some((value) => typeof value === "number")
      ? surfaceOffsets
      : undefined,
    total:
      searchResult.status === "fulfilled" && typeof searchResult.value.total === "number"
        ? searchResult.value.total
        : notes.length + effectiveProfiles.length + hashtags.length + relays.length,
    section_totals: {
      ...(sourceSectionTotals ?? {}),
      ...sectionTotals,
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

export async function getProfileFollowers(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<ProfileFollowersResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<ProfileFollowersApiResponse>(
        nativeApiV1Routes.profileFollowersByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeProfileFollowersResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Profile followers lookup failed.");
    }
  }

  throw lastError ?? new Error("Profile followers lookup failed.");
}

export async function getProfileMentions(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<ProfileMentionsResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<ProfileMentionsApiResponse>(
        nativeApiV1Routes.profileMentionsByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeProfileMentionsResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Profile mentions lookup failed.");
    }
  }

  throw lastError ?? new Error("Profile mentions lookup failed.");
}

export async function getRelatedProfiles(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<RelatedProfilesResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<RelatedProfilesApiResponse>(
        nativeApiV1Routes.relatedProfilesByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeRelatedProfilesResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Related profiles lookup failed.");
    }
  }

  throw lastError ?? new Error("Related profiles lookup failed.");
}

export async function getContactListContext(
  pubkey: string,
  cacheClass: CacheClass = "requestTime"
): Promise<ContactListContextResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<ContactListContextApiResponse>(
        nativeApiV1Routes.contactListByPubkey(candidate),
        {
          cacheClass,
        }
      );
      return normalizeContactListContextResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Contact list lookup failed.");
    }
  }

  throw lastError ?? new Error("Contact list lookup failed.");
}

export async function getRelayListContext(
  pubkey: string,
  cacheClass: CacheClass = "requestTime"
): Promise<RelayListContextResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<RelayListContextApiResponse>(
        nativeApiV1Routes.relayListByPubkey(candidate),
        {
          cacheClass,
        }
      );
      return normalizeRelayListContextResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Relay list lookup failed.");
    }
  }

  throw lastError ?? new Error("Relay list lookup failed.");
}

export async function getProfileTopics(
  pubkey: string,
  cacheClass: CacheClass = "requestTime"
): Promise<ProfileTopicsResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<ProfileTopicsApiResponse>(
        nativeApiV1Routes.profileTopicsByPubkey(candidate),
        {
          cacheClass,
        }
      );
      return normalizeProfileTopicsResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Profile topics lookup failed.");
    }
  }

  throw lastError ?? new Error("Profile topics lookup failed.");
}

export async function getAuthorEvents(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<AuthorEventsResponse> {
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
      const response = await fetchApiJson<AuthorEventsApiResponse>(
        nativeApiV1Routes.authorEventsByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeAuthorEventsResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Author events lookup failed.");
    }
  }

  throw lastError ?? new Error("Author events lookup failed.");
}

export async function getAuthorReplies(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<AuthorRepliesResponse> {
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
      const response = await fetchApiJson<AuthorRepliesApiResponse>(
        nativeApiV1Routes.authorRepliesByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeAuthorRepliesResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Author replies lookup failed.");
    }
  }

  throw lastError ?? new Error("Author replies lookup failed.");
}

export async function getAuthorReactions(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<AuthorReactionsResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<AuthorReactionsApiResponse>(
        nativeApiV1Routes.authorReactionsByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeAuthorReactionsResponse(response);
    } catch (error) {
      if (isApiNotFound(error)) continue;
      lastError = error instanceof Error ? error : new Error("Author reactions lookup failed.");
    }
  }

  try {
    const events = await getAuthorEvents(pubkey, cacheClass, query);
    const reactions = (events.events ?? []).filter((event) => event.kind === 7);
    return {
      ...events,
      pubkey: events.pubkey,
      reactions: reactions
        .map((event) => normalizeAuthorReactionsResponse({ reactions: [event] }).reactions?.[0])
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    };
  } catch (error) {
    throw (
      lastError ?? (error instanceof Error ? error : new Error("Author reactions lookup failed."))
    );
  }
}

export async function getAuthorZaps(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<AuthorZapsResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<AuthorZapsApiResponse>(
        nativeApiV1Routes.authorZapsByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeAuthorZapsResponse(response);
    } catch (error) {
      if (isApiNotFound(error)) continue;
      lastError = error instanceof Error ? error : new Error("Author zaps lookup failed.");
    }
  }

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<AuthorEventsApiResponse>(
        nativeApiV1Routes.authorEventsByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery({ ...query, kind: 9735 }),
        }
      );
      const normalized = normalizeAuthorEventsResponse(response);
      const sentZapEvents = (normalized.events ?? []).filter(
        (event) => event.kind === 9735 || event.kind === 9734
      );
      return {
        ...normalized,
        pubkey: normalized.pubkey ?? candidate,
        zaps: sentZapEvents
          .map((event) => normalizeAuthorZapsResponse({ zaps: [event] }).zaps?.[0])
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Author zaps lookup failed.");
    }
  }

  throw lastError ?? new Error("Author zaps lookup failed.");
}

async function fetchAuthorAnalyticsByRoutes(
  pubkey: string,
  cacheClass: CacheClass,
  routes: Array<(pubkey: string) => string>
): Promise<AuthorAnalyticsResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    for (const route of routes) {
      try {
        const response = await fetchApiJson<AuthorAnalyticsApiResponse>(route(candidate), {
          cacheClass,
        });
        return normalizeAuthorAnalyticsResponse(response);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Author analytics lookup failed.");
      }
    }
  }

  throw lastError ?? new Error("Author analytics lookup failed.");
}

export async function getAuthorActivityAnalytics(
  pubkey: string,
  cacheClass: CacheClass = "requestTime"
): Promise<AuthorAnalyticsResponse> {
  return fetchAuthorAnalyticsByRoutes(pubkey, cacheClass, [
    nativeApiV1Routes.authorAnalyticsActivityByPubkey,
  ]);
}

export async function getAuthorPostingBehaviorAnalytics(
  pubkey: string,
  cacheClass: CacheClass = "requestTime"
): Promise<AuthorAnalyticsResponse> {
  return fetchAuthorAnalyticsByRoutes(pubkey, cacheClass, [
    nativeApiV1Routes.authorAnalyticsPostingBehaviorByPubkey,
    nativeApiV1Routes.authorAnalyticsBehaviorByPubkey,
  ]);
}

export async function getTrustScore(
  pubkey: string,
  cacheClass: CacheClass = "requestTime"
): Promise<TrustScoreResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<TrustScoreApiResponse>(
        nativeApiV1Routes.trustScoreByPubkey(candidate),
        {
          cacheClass,
        }
      );
      return normalizeTrustScoreResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Trust score lookup failed.");
    }
  }

  throw lastError ?? new Error("Trust score lookup failed.");
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

function buildCursorQuery(
  query?: CursorQuery
): Record<string, string | number | undefined> | undefined {
  if (!query) return undefined;
  return {
    cursor: query.cursor,
    limit: query.limit,
    direction: query.direction,
    kind: query.kind,
  };
}

export async function getEventAncestors(
  eventId: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<EventAncestorsResponse> {
  const response = await fetchApiJson<EventAncestorsApiResponse>(
    nativeApiV1Routes.eventAncestorsById(eventId),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeEventAncestorsResponse(response);
}

export async function getEventReplies(
  eventId: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<EventRepliesResponse> {
  const response = await fetchApiJson<EventRepliesApiResponse>(
    nativeApiV1Routes.eventRepliesById(eventId),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeEventRepliesResponse(response);
}

export async function getThreadSummary(
  rootEventId: string,
  cacheClass: CacheClass = "requestTime"
): Promise<ThreadSummaryResponse> {
  const response = await fetchApiJson<ThreadSummaryApiResponse>(
    nativeApiV1Routes.threadSummaryByRootEventId(rootEventId),
    {
      cacheClass,
    }
  );
  return normalizeThreadSummaryResponse(response);
}

export async function getThreadActivity(
  rootEventId: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<ThreadActivityResponse> {
  const response = await fetchApiJson<ThreadActivityApiResponse>(
    nativeApiV1Routes.threadActivityByRootEventId(rootEventId),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeThreadActivityResponse(response);
}

export async function getRelatedNotes(
  eventId: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<RelatedNotesResponse> {
  const response = await fetchApiJson<RelatedNotesApiResponse>(
    nativeApiV1Routes.noteRelatedByEventId(eventId),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeRelatedNotesResponse(response);
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

export async function getHashtagDetail(
  hashtag: string,
  cacheClass: CacheClass = "requestTime"
): Promise<HashtagDetailResponse> {
  const normalizedHashtag = normalizeHashtagQuery(hashtag);
  const response = await fetchApiJson<HashtagDetailApiResponse>(
    nativeApiV1Routes.hashtagByName(normalizedHashtag),
    {
      cacheClass,
    }
  );
  return normalizeHashtagDetailResponse(response);
}

export async function getHashtagNotes(
  hashtag: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<HashtagNotesResponse> {
  const normalizedHashtag = normalizeHashtagQuery(hashtag);
  const response = await fetchApiJson<HashtagNotesApiResponse>(
    nativeApiV1Routes.hashtagNotesByName(normalizedHashtag),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeHashtagNotesResponse(response);
}

export async function getRelatedHashtags(
  hashtag: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<RelatedHashtagsResponse> {
  const normalizedHashtag = normalizeHashtagQuery(hashtag);
  const response = await fetchApiJson<RelatedHashtagsApiResponse>(
    nativeApiV1Routes.hashtagRelatedByName(normalizedHashtag),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeRelatedHashtagsResponse(response);
}

export async function getDomainDetail(
  domain: string,
  cacheClass: CacheClass = "requestTime"
): Promise<DomainDetailResponse> {
  const normalizedDomain = normalizeDomainQuery(domain);
  const response = await fetchApiJson<DomainDetailApiResponse>(
    nativeApiV1Routes.domainByName(normalizedDomain),
    {
      cacheClass,
    }
  );
  return normalizeDomainDetailResponse(response);
}

export async function getDomainNotes(
  domain: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<DomainNotesResponse> {
  const normalizedDomain = normalizeDomainQuery(domain);
  const response = await fetchApiJson<DomainNotesApiResponse>(
    nativeApiV1Routes.domainNotesByName(normalizedDomain),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeDomainNotesResponse(response);
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

export async function getRelayHealth(
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<RelayHealthResponse> {
  const response = await fetchApiJson<RelayHealthApiResponse>(nativeApiV1Routes.relayHealth, {
    cacheClass,
    query: buildCursorQuery(query),
  });
  return normalizeRelayHealthResponse(response);
}

export async function getPopularRelays(
  cacheClass: CacheClass = "shortTtl",
  options?: { limit?: number }
): Promise<PopularRelaysResponse> {
  return fetchApiJson<PopularRelaysResponse>(nativeApiV1Routes.relayPopular, {
    cacheClass,
    query: { limit: options?.limit },
  });
}

export async function getRelayProbeHealth(
  cacheClass: CacheClass = "shortTtl",
  options?: { limit?: number }
): Promise<RelayProbeHealthResponse> {
  return fetchApiJson<RelayProbeHealthResponse>(nativeApiV1Routes.relayProbeHealth, {
    cacheClass,
    query: { limit: options?.limit },
  });
}
