"use server";

import type { LoadMoreChunk } from "@/components/data/load-more-list";
import { NotesList, ProfilesList } from "@/components/data/renderers";
import { getSearch } from "@/lib/api/endpoints";
import {
  extractEventAuthorPubkeys,
  fetchProfilesByPubkey,
  hydrateProfiles,
} from "@/lib/api/profile-hydration";
import { MAX_LIST_LIMIT } from "@/lib/search-params/pagination";
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
  cursor: string
): Promise<LoadMoreChunk> {
  const args = normalizeLoadMoreArgs(q, limit, cursor);
  if (!args) return { content: null };

  const payload = await getSearch(
    { q: args.q, tab: "notes", limit: args.limit, offset: 0, cursor: args.cursor },
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

  return {
    content:
      notes.length > 0 ? <NotesList notes={notes} authorsByPubkey={authorsByPubkey} /> : null,
    nextCursor:
      payload.surface_cursors?.notes ??
      (typeof payload.next_cursor === "string" ? payload.next_cursor : undefined),
  };
}

/** Next page of profile results, server-rendered for in-place appending. */
export async function loadMoreSearchProfiles(
  q: string,
  limit: number,
  cursor: string
): Promise<LoadMoreChunk> {
  const args = normalizeLoadMoreArgs(q, limit, cursor);
  if (!args) return { content: null };

  const payload = await getSearch(
    { q: args.q, tab: "profiles", limit: args.limit, offset: 0, cursor: args.cursor },
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

  return {
    content: profiles.length > 0 ? <ProfilesList profiles={profiles} /> : null,
    nextCursor:
      payload.surface_cursors?.profiles ??
      (typeof payload.next_cursor === "string" ? payload.next_cursor : undefined),
  };
}
