import type {
  HashtagDetailApiResponse,
  HashtagDetailResponse,
  HashtagNotesApiResponse,
  HashtagNotesResponse,
  RelatedHashtagsApiResponse,
  RelatedHashtagsResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import { normalizeHashtagQuery } from "@/lib/hashtags";
import {
  normalizeHashtagDetailResponse,
  normalizeHashtagNotesResponse,
  normalizeRelatedHashtagsResponse,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import { buildCursorQuery, type CursorQuery, nativeApiV1Routes } from "@/lib/api/endpoints/shared";

export async function getHashtagDetail(
  hashtag: string,
  cacheClass: CacheClass = "shortTtl"
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
  cacheClass: CacheClass = "shortTtl",
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
  cacheClass: CacheClass = "shortTtl",
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
