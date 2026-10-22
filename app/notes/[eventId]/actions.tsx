"use server";

import type { LoadMoreChunk } from "@/components/data/load-more-list";
import { NoteCard } from "@/components/explorer/note-card";
import { profileLabel } from "@/components/explorer/utils";
import { ThreadReplies } from "@/components/thread/thread-view";
import { fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { loadNoteRelatedData, loadRepliesPage } from "@/lib/notes/load-note-page-data";
import { formatRepostRollup, partitionRelatedNotes } from "@/lib/notes/related-notes";
import { buildReplyTree } from "@/lib/notes/thread-tree";
import { isValidEventIdParam, resolveEventIdParam } from "@/lib/routing/params";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import type { EventRecord, Profile } from "@/lib/types/api";

/**
 * Server actions behind the note page's in-place controls. They are public
 * endpoints regardless of where the button lives, so every input is validated
 * before any upstream call.
 */

const MAX_CURSOR_LENGTH = 2048;

function normalizeEventId(value: unknown): string | null {
  if (typeof value !== "string" || !isValidEventIdParam(value)) return null;
  return resolveEventIdParam(value) ?? value;
}

function normalizeCursor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_CURSOR_LENGTH) return undefined;
  return trimmed;
}

/** First page passes null. A present cursor must be a short string. */
function readOptionalCursor(value: unknown): { ok: true; cursor?: string } | { ok: false } {
  if (value === null || value === undefined || value === "") return { ok: true };
  const cursor = normalizeCursor(value);
  if (!cursor) return { ok: false };
  return { ok: true, cursor };
}

function NoteList({
  notes,
  authorsByPubkey,
  contentResolution,
  contextEventId,
}: {
  notes: EventRecord[];
  authorsByPubkey: Record<string, Profile>;
  contentResolution?: NoteContentResolution;
  contextEventId: string;
}) {
  return (
    <ul className="space-y-1">
      {notes.map((note, index) => (
        <li key={note.id ?? `note-${index}`} className="min-w-0">
          <NoteCard
            note={note}
            author={
              typeof note.pubkey === "string"
                ? authorsByPubkey[note.pubkey.toLowerCase()]
                : undefined
            }
            density="reply"
            contentResolution={contentResolution}
            contextEventId={contextEventId}
          />
        </li>
      ))}
    </ul>
  );
}

function replyChunk(
  page: Awaited<ReturnType<typeof loadRepliesPage>>,
  focalEventId: string,
  depth: number,
  flattenUnderPubkey?: string
): LoadMoreChunk {
  let nodes = buildReplyTree(page.replies, focalEventId);
  if (flattenUnderPubkey) {
    nodes = nodes.map((node) => ({
      ...node,
      replyingToPubkey: flattenUnderPubkey,
      children: [],
    }));
  }
  return {
    content:
      nodes.length > 0 ? (
        <ThreadReplies
          nodes={nodes}
          authorsByPubkey={page.authorsByPubkey}
          contentResolution={page.contentResolution}
          loadDirectReplies={loadDirectReplies}
          depth={depth}
        />
      ) : null,
    nextCursor:
      typeof page.repliesNextCursor === "string" && page.repliesNextCursor.length > 0
        ? page.repliesNextCursor
        : undefined,
  };
}

export async function loadMoreReplies(eventId: unknown, cursor: unknown): Promise<LoadMoreChunk> {
  const id = normalizeEventId(eventId);
  const normalizedCursor = normalizeCursor(cursor);
  if (!id || !normalizedCursor) return { content: null };

  const page = await loadRepliesPage(id, normalizedCursor);
  return replyChunk(page, id, 0);
}

/**
 * Direct replies of one note, appended under its card. `flattenUnderPubkey`
 * is set once the branch is already indented, so the next level stays put
 * and says who it answers instead of nesting again.
 */
export async function loadDirectReplies(
  eventId: unknown,
  flattenUnderPubkey: unknown,
  cursor: unknown
): Promise<LoadMoreChunk> {
  const id = normalizeEventId(eventId);
  const cursorResult = readOptionalCursor(cursor);
  if (!id || !cursorResult.ok) return { content: null };
  const flatten =
    typeof flattenUnderPubkey === "string" && /^[a-f0-9]{64}$/i.test(flattenUnderPubkey)
      ? flattenUnderPubkey.toLowerCase()
      : undefined;

  const page = await loadRepliesPage(id, cursorResult.cursor);
  // The parent author isn't on this page of replies, but the line says who it answers.
  let authorsByPubkey = page.authorsByPubkey;
  if (flatten && !authorsByPubkey[flatten]) {
    try {
      authorsByPubkey = {
        ...authorsByPubkey,
        ...(await fetchProfilesByPubkey([flatten], "shortTtl")),
      };
    } catch {
      authorsByPubkey = page.authorsByPubkey;
    }
  }
  return replyChunk({ ...page, authorsByPubkey }, id, 1, flatten);
}

export async function loadRepostRollup(eventId: unknown, total: unknown): Promise<LoadMoreChunk> {
  const id = normalizeEventId(eventId);
  if (!id) return { content: null };
  const data = await loadNoteRelatedData(id, { view: "full" });
  const { reposts } = partitionRelatedNotes(data.relatedNotes, id);
  const names: string[] = [];
  const seen = new Set<string>();
  for (const repost of reposts) {
    const pubkey = typeof repost.pubkey === "string" ? repost.pubkey.toLowerCase() : "";
    if (!pubkey || seen.has(pubkey)) continue;
    seen.add(pubkey);
    const profile = data.authorsByPubkey[pubkey];
    names.push(profile ? profileLabel(profile) : `${pubkey.slice(0, 8)}…`);
  }
  const count =
    typeof total === "number" && Number.isFinite(total) && total > 0 ? total : names.length;
  return { content: <span>{formatRepostRollup(names, count)}</span> };
}

export async function loadQuotes(eventId: unknown, cursor: unknown): Promise<LoadMoreChunk> {
  const id = normalizeEventId(eventId);
  const cursorResult = readOptionalCursor(cursor);
  if (!id || !cursorResult.ok) return { content: null };

  const data = await loadNoteRelatedData(id, {
    view: "full",
    ...(cursorResult.cursor ? { related_cursor: cursorResult.cursor } : {}),
  });
  const { mentions } = partitionRelatedNotes(data.relatedNotes, id);
  return {
    content:
      mentions.length > 0 ? (
        <NoteList
          notes={mentions}
          authorsByPubkey={data.authorsByPubkey}
          contentResolution={data.contentResolution}
          contextEventId={id}
        />
      ) : null,
    nextCursor:
      typeof data.relatedNextCursor === "string" && data.relatedNextCursor.length > 0
        ? data.relatedNextCursor
        : undefined,
  };
}
