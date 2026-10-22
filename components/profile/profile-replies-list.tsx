import Link from "next/link";

import { NoteCard } from "@/components/explorer/note-card";
import { noteInlineAuthorProfile } from "@/components/explorer/utils";
import { resolveReplyParent } from "@/lib/notes/thread-tree";
import type { EventRecord, Profile } from "@/lib/types/api";

function oneLine(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

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

export function ProfileRepliesList({
  replies,
  parentsById,
  authorsByPubkey,
}: {
  replies: EventRecord[];
  parentsById: Record<string, EventRecord>;
  authorsByPubkey?: Record<string, Profile>;
}) {
  return (
    <ul className="min-w-0 space-y-4">
      {replies.map((reply, index) => {
        const parentId = resolveReplyParent(reply);
        const parent = parentId ? parentsById[parentId.toLowerCase()] : undefined;
        const quote = oneLine(typeof parent?.content === "string" ? parent.content : undefined);
        const replyId = reply.id ?? `reply-${index}`;
        return (
          <li key={replyId} className="min-w-0 space-y-2">
            {parentId ? (
              <Link
                href={`/notes/${encodeURIComponent(parent?.id ?? parentId)}`}
                title={quote || parentId}
                className="text-ink-muted hover:text-ink block truncate text-sm"
              >
                {quote || "Replying to a note"}
              </Link>
            ) : null}
            <NoteCard
              note={reply}
              author={authorFor(reply, authorsByPubkey)}
              showAuthor={false}
              showUtilityLinks={false}
              omitZeroStats
              mediaVariant="compact"
            />
          </li>
        );
      })}
    </ul>
  );
}
