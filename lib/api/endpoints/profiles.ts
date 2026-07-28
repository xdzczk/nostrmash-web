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
import {
  buildCursorQuery,
  type CursorQuery,
  nativeApiV1Routes,
  withPubkeyCandidates,
} from "@/lib/api/endpoints/shared";

export async function getProfile(pubkey: string, cacheClass: CacheClass = "shortTtl") {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<ProfileApiResponse>(
        nativeApiV1Routes.profileByPubkey(candidate),
        { cacheClass }
      );
      const profile = normalizeProfile(response);
      if (!profile) {
        throw new Error("API returned an invalid profile payload.");
      }
      return profile;
    },
    "Profile lookup failed."
  );
}

export async function getProfilesBatch(pubkeys: string[], cacheClass: CacheClass = "shortTtl") {
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

export async function getProfileSummary(pubkey: string, cacheClass: CacheClass = "shortTtl") {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<ProfileSummaryApiResponse>(
        nativeApiV1Routes.profileSummaryByPubkey(candidate),
        { cacheClass }
      );
      return normalizeProfileSummaryResponse(response);
    },
    "Profile summary lookup failed."
  );
}

export async function getUserLongForm(
  pubkey: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<UserLongFormResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<UserLongFormApiResponse>(
        nativeApiV1Routes.userLongFormByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeUserLongFormResponse(response);
    },
    "User long-form lookup failed."
  );
}

export async function getUserBookmarks(
  pubkey: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<UserBookmarksResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<UserBookmarksApiResponse>(
        nativeApiV1Routes.userBookmarksByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeUserBookmarksResponse(response);
    },
    "User bookmarks lookup failed."
  );
}

export async function getUserHighlights(
  pubkey: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<UserHighlightsResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<UserHighlightsApiResponse>(
        nativeApiV1Routes.userHighlightsByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeUserHighlightsResponse(response);
    },
    "User highlights lookup failed."
  );
}

export async function getUserMuteList(
  pubkey: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<UserMuteListResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<UserMuteListApiResponse>(
        nativeApiV1Routes.userMuteListByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeUserMuteListResponse(response);
    },
    "User mute list lookup failed."
  );
}

export async function getUserMutedBy(
  pubkey: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<UserMutedByResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<UserMutedByApiResponse>(
        nativeApiV1Routes.userMutedByByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeUserMutedByResponse(response);
    },
    "User muted-by lookup failed."
  );
}

export async function getRelatedProfiles(
  pubkey: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<RelatedProfilesResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<RelatedProfilesApiResponse>(
        nativeApiV1Routes.relatedProfilesByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeRelatedProfilesResponse(response);
    },
    "Related profiles lookup failed."
  );
}

export async function getAuthorEvents(
  pubkey: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<AuthorEventsResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<AuthorEventsApiResponse>(
        nativeApiV1Routes.authorEventsByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeAuthorEventsResponse(response);
    },
    "Author events lookup failed."
  );
}

export async function getAuthorReplies(
  pubkey: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<AuthorRepliesResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<AuthorRepliesApiResponse>(
        nativeApiV1Routes.authorRepliesByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeAuthorRepliesResponse(response);
    },
    "Author replies lookup failed."
  );
}

export async function getAuthorReactions(
  pubkey: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<AuthorReactionsResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<AuthorReactionsApiResponse>(
        nativeApiV1Routes.authorReactionsByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeAuthorReactionsResponse(response);
    },
    "Author reactions lookup failed."
  );
}

export async function getAuthorZaps(
  pubkey: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<AuthorZapsResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<AuthorZapsApiResponse>(
        nativeApiV1Routes.authorZapsByPubkey(candidate),
        {
          cacheClass,
          query: buildCursorQuery(query),
        }
      );
      return normalizeAuthorZapsResponse(response);
    },
    "Author zaps lookup failed."
  );
}
