import type {
  AuthorEventsApiResponse,
  AuthorEventsResponse,
  AuthorReactionsApiResponse,
  AuthorReactionsResponse,
  AuthorRepliesApiResponse,
  AuthorRepliesResponse,
  AuthorZapsApiResponse,
  AuthorZapsResponse,
  BatchProfilesApiResponse,
  Profile,
  ProfileApiResponse,
  ProfileSummaryApiResponse,
  RelatedProfilesApiResponse,
  RelatedProfilesResponse,
  UserBookmarksApiResponse,
  UserBookmarksResponse,
  UserHighlightsApiResponse,
  UserHighlightsResponse,
  UserLongFormApiResponse,
  UserLongFormResponse,
  UserMuteListApiResponse,
  UserMuteListResponse,
  UserMutedByApiResponse,
  UserMutedByResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import {
  normalizeAuthorEventsResponse,
  normalizeAuthorReactionsResponse,
  normalizeAuthorRepliesResponse,
  normalizeAuthorZapsResponse,
  normalizeProfile,
  normalizeProfiles,
  normalizeProfileSummaryResponse,
  normalizeRelatedProfilesResponse,
  normalizeUserBookmarksResponse,
  normalizeUserHighlightsResponse,
  normalizeUserLongFormResponse,
  normalizeUserMuteListResponse,
  normalizeUserMutedByResponse,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import { npubToHex } from "@/lib/nostr/npub";
import {
  buildCursorQuery,
  buildPubkeyCandidates,
  type CursorQuery,
  nativeApiV1Routes,
} from "@/lib/api/endpoints/shared";

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

export async function getUserLongForm(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<UserLongFormResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<UserLongFormApiResponse>(
        nativeApiV1Routes.userLongFormByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeUserLongFormResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("User long-form lookup failed.");
    }
  }

  throw lastError ?? new Error("User long-form lookup failed.");
}

export async function getUserBookmarks(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<UserBookmarksResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<UserBookmarksApiResponse>(
        nativeApiV1Routes.userBookmarksByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeUserBookmarksResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("User bookmarks lookup failed.");
    }
  }

  throw lastError ?? new Error("User bookmarks lookup failed.");
}

export async function getUserHighlights(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<UserHighlightsResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<UserHighlightsApiResponse>(
        nativeApiV1Routes.userHighlightsByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeUserHighlightsResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("User highlights lookup failed.");
    }
  }

  throw lastError ?? new Error("User highlights lookup failed.");
}

export async function getUserMuteList(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<UserMuteListResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<UserMuteListApiResponse>(
        nativeApiV1Routes.userMuteListByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeUserMuteListResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("User mute list lookup failed.");
    }
  }

  throw lastError ?? new Error("User mute list lookup failed.");
}

export async function getUserMutedBy(
  pubkey: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<UserMutedByResponse> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchApiJson<UserMutedByApiResponse>(
        nativeApiV1Routes.userMutedByByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeUserMutedByResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("User muted-by lookup failed.");
    }
  }

  throw lastError ?? new Error("User muted-by lookup failed.");
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
      lastError = error instanceof Error ? error : new Error("Author reactions lookup failed.");
    }
  }

  throw lastError ?? new Error("Author reactions lookup failed.");
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
      lastError = error instanceof Error ? error : new Error("Author zaps lookup failed.");
    }
  }

  throw lastError ?? new Error("Author zaps lookup failed.");
}
