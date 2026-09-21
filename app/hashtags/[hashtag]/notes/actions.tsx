"use server";

import type { LoadMoreChunk } from "@/components/data/load-more-list";
import { NotesList } from "@/components/data/renderers";
import { getHashtagNotes } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { isValidHashtag } from "@/lib/hashtags";
import { MAX_LIST_LIMIT } from "@/lib/search-params/pagination";
import type { Profile } from "@/lib/types/api";

/**
 * Server action behind the hashtag notes "Show more" button: fetches the next
 * cursor page, hydrates authors, and returns server-rendered list markup the
 * client appends in place. Inputs are validated — actions are public
 * endpoints regardless of where the button lives.
 */
export async function loadMoreHashtagNotes(
  hashtag: string,
  limit: number,
  cursor: string
): Promise<LoadMoreChunk> {
  const normalizedHashtag = typeof hashtag === "string" ? hashtag.trim().toLowerCase() : "";
  const normalizedCursor = typeof cursor === "string" ? cursor.trim() : "";
  if (!isValidHashtag(normalizedHashtag) || !normalizedCursor || normalizedCursor.length > 2048) {
    return { content: null };
  }
  const normalizedLimit =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), MAX_LIST_LIMIT)
      : 20;

  const payload = await getHashtagNotes(normalizedHashtag, "shortTtl", {
    cursor: normalizedCursor,
    limit: normalizedLimit,
  });
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
    nextCursor: typeof payload.next_cursor === "string" ? payload.next_cursor : undefined,
  };
}
