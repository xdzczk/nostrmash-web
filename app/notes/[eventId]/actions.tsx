"use server";

import type { LoadMoreChunk } from "@/components/data/load-more-list";
import { NoteCard } from "@/components/explorer/note-card";
import { ThreadReplies } from "@/components/thread/thread-view";
import {
  loadNoteActivityData,
  loadNoteRelatedData,
  loadRepliesPage,
} from "@/lib/notes/load-note-page-data";
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

export async function loadMoreReplies(eventId: unknown, cursor: unknown): Promise<LoadMoreChunk> {
  const id = normalizeEventId(eventId);
  const normalizedCursor = normalizeCursor(cursor);
  if (!id || !normalizedCursor) return { content: null };

  const page = await loadRepliesPage(id, normalizedCursor);
  const nodes = buildReplyTree(page.replies, id);
  return {
    content:
      nodes.length > 0 ? (
        <ThreadReplies
          nodes={nodes}
          authorsByPubkey={page.authorsByPubkey}
          contentResolution={page.contentResolution}
        />
      ) : null,
    nextCursor:
      typeof page.repliesNextCursor === "string" && page.repliesNextCursor.length > 0
        ? page.repliesNextCursor
        : undefined,
  };
}

export async function loadThreadActivity(
  rootEventId: unknown,
  focalEventId: unknown,
  cursor: unknown
): Promise<LoadMoreChunk> {
  const id = normalizeEventId(rootEventId);
  if (!id) return { content: null };
  const focalId = normalizeEventId(focalEventId) ?? id;
  const normalizedCursor = normalizeCursor(cursor);

  const data = await loadNoteActivityData(id, {
    view: "full",
    ...(normalizedCursor ? { activity_cursor: normalizedCursor } : {}),
  });
  return {
    content:
      data.activity.length > 0 ? (
        <NoteList
          notes={data.activity}
          authorsByPubkey={data.authorsByPubkey}
          contentResolution={data.contentResolution}
          contextEventId={focalId}
        />
      ) : null,
    nextCursor:
      typeof data.activityNextCursor === "string" && data.activityNextCursor.length > 0
        ? data.activityNextCursor
        : undefined,
  };
}

export async function loadRelatedNotes(eventId: unknown, cursor: unknown): Promise<LoadMoreChunk> {
  const id = normalizeEventId(eventId);
  if (!id) return { content: null };
  const normalizedCursor = normalizeCursor(cursor);

  const data = await loadNoteRelatedData(id, {
    view: "full",
    ...(normalizedCursor ? { related_cursor: normalizedCursor } : {}),
  });
  return {
    content:
      data.relatedNotes.length > 0 ? (
        <NoteList
          notes={data.relatedNotes}
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
