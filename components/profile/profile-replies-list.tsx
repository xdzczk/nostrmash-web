import Link from "next/link";

import { NoteCard } from "@/components/explorer/note-card";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { activitySnippet } from "@/components/explorer/note-preview";
import { noteInlineAuthorProfile, profileLabel } from "@/components/explorer/utils";
import { resolveReplyParent } from "@/lib/notes/thread-tree";
import type { EventRecord, Profile } from "@/lib/types/api";

function authorFor(
  note: EventRecord,
  authorsByPubkey?: Record<string, Profile>
): Profile | undefined {
  return (
    noteInlineAuthorProfile(note) ??
    (typeof note.pubkey === "string"
      ? (authorsByPubkey?.[note.pubkey.toLowerCase()] ?? authorsByPubkey?.[note.pubkey])
      : undefined)
  );
}

function replyContext(
  parent: EventRecord | undefined,
  authorsByPubkey: Record<string, Profile> | undefined,
  resolution: NoteContentResolution | undefined
): string {
  const quote = parent ? activitySnippet(parent, resolution) : "";
  const author = parent ? authorFor(parent, authorsByPubkey) : undefined;
  const name = author ? profileLabel(author) : "";
  if (quote && name) return `Replying to ${name}: ${quote}`;
  if (quote) return `Replying to ${quote}`;
  if (name) return `Replying to ${name}`;
  return "Replying to a note";
}

export function ProfileRepliesList({
  replies,
  parentsById,
  authorsByPubkey,
  resolution,
}: {
  replies: EventRecord[];
  parentsById: Record<string, EventRecord>;
  authorsByPubkey?: Record<string, Profile>;
  resolution?: NoteContentResolution;
}) {
  return (
    <ul className="min-w-0 space-y-4">
      {replies.map((reply, index) => {
        const parentId = resolveReplyParent(reply);
        const parent = parentId ? parentsById[parentId.toLowerCase()] : undefined;
        const context = parentId ? replyContext(parent, authorsByPubkey, resolution) : "";
        const replyId = reply.id ?? `reply-${index}`;
        return (
          <li key={replyId} className="min-w-0 space-y-2">
            {parentId ? (
              <Link
                href={`/notes/${encodeURIComponent(parent?.id ?? parentId)}`}
                title={context}
                className="text-ink-muted hover:text-ink block truncate text-sm"
              >
                {context}
              </Link>
            ) : null}
            <NoteCard
              note={reply}
              author={authorFor(reply, authorsByPubkey)}
              showAuthor={false}
              showUtilityLinks={false}
              mediaVariant="compact"
              suppressEmbeds
              contentSize="profile"
            />
          </li>
        );
      })}
    </ul>
  );
}
