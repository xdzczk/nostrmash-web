"use server";

import type { LoadMoreChunk } from "@/components/data/load-more-list";
import { ProfilesList } from "@/components/data/renderers";
import { SearchHitList } from "@/components/search/search-hit-list";
import { getSearch } from "@/lib/api/endpoints";
import {
  extractEventAuthorPubkeys,
  fetchProfilesByPubkey,
  hydrateProfiles,
} from "@/lib/api/profile-hydration";
import { decodeContinuation, encodeOffsetToken } from "@/lib/search/display";
import { highlightTermsForQuery } from "@/lib/search/highlight";
import { MAX_LIST_LIMIT } from "@/lib/search-params/pagination";
import { decodeSearchFilters } from "@/lib/search-params/search";
import type { Profile } from "@/lib/types/api";

const MAX_QUERY_LENGTH = 256;

/**
 * Validate the free-form inputs of the search "Show more" actions. These are
 * public endpoints regardless of where the buttons live, so clamp everything.
 */
function normalizeLoadMoreArgs(
  q: string,
  limit: number,
  cursor: string
): { q: string; limit: number; cursor: string } | null {
  const normalizedQuery = typeof q === "string" ? q.trim() : "";
  const normalizedCursor = typeof cursor === "string" ? cursor.trim() : "";
  if (
    normalizedQuery.length === 0 ||
    normalizedQuery.length > MAX_QUERY_LENGTH ||
    normalizedCursor.length === 0 ||
    normalizedCursor.length > 2048
  ) {
    return null;
  }
  const normalizedLimit =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), MAX_LIST_LIMIT)
      : 20;
  return { q: normalizedQuery, limit: normalizedLimit, cursor: normalizedCursor };
}

/** Next page of note results, server-rendered for in-place appending. */
export async function loadMoreSearchNotes(
  q: string,
  limit: number,
  filters: string,
  highlightQuery: string,
  token: string
): Promise<LoadMoreChunk> {
  const args = normalizeLoadMoreArgs(q, limit, token);
  if (!args) return { content: null };
  const continuation = decodeContinuation(args.cursor);
  const searchFilters = decodeSearchFilters(filters);

  const payload = await getSearch(
    {
      q: args.q,
      tab: "notes",
      limit: args.limit,
      offset: continuation.offset ?? 0,
      cursor: continuation.cursor,
      ...searchFilters,
    },
    "requestTime"
  );
  const notes = payload.notes ?? [];
  let authorsByPubkey: Record<string, Profile> = {};
  if (notes.length > 0) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(extractEventAuthorPubkeys(notes), "shortTtl");
    } catch {
      authorsByPubkey = {};
    }
  }
  const nextCursor =
    payload.surface_cursors?.notes ??
    (typeof payload.next_cursor === "string" && payload.next_cursor.length > 0
      ? payload.next_cursor
      : typeof payload.next_offset === "number"
        ? encodeOffsetToken(payload.next_offset)
        : continuation.cursor
          ? undefined
          : notes.length >= args.limit
            ? encodeOffsetToken((continuation.offset ?? 0) + notes.length)
            : undefined);

  return {
    content:
      notes.length > 0 ? (
        <SearchHitList
          notes={notes}
          authorsByPubkey={authorsByPubkey}
          highlightTerms={highlightTermsForQuery(highlightQuery || args.q)}
        />
      ) : null,
    nextCursor,
  };
}

/** Next page of profile results, server-rendered for in-place appending. */
export async function loadMoreSearchProfiles(
  q: string,
  limit: number,
  filters: string,
  token: string
): Promise<LoadMoreChunk> {
  const args = normalizeLoadMoreArgs(q, limit, token);
  if (!args) return { content: null };
  const continuation = decodeContinuation(args.cursor);
  const searchFilters = decodeSearchFilters(filters);

  const payload = await getSearch(
    {
      q: args.q,
      tab: "profiles",
      limit: args.limit,
      offset: continuation.offset ?? 0,
      cursor: continuation.cursor,
      ...searchFilters,
    },
    "requestTime"
  );
  let profiles = payload.profiles ?? [];
  if (profiles.length > 0) {
    try {
      profiles = await hydrateProfiles(profiles, "shortTtl");
    } catch {
      // keep raw search profile rows
    }
  }
  const nextCursor =
    payload.surface_cursors?.profiles ??
    (typeof payload.next_cursor === "string" && payload.next_cursor.length > 0
      ? payload.next_cursor
      : typeof payload.next_offset === "number"
        ? encodeOffsetToken(payload.next_offset)
        : continuation.cursor
          ? undefined
          : profiles.length >= args.limit
            ? encodeOffsetToken((continuation.offset ?? 0) + profiles.length)
            : undefined);

  return {
    content: profiles.length > 0 ? <ProfilesList profiles={profiles} searchContext /> : null,
    nextCursor,
  };
}
