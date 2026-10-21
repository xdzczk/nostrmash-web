import type { ReactNode } from "react";

import { EmptyState } from "@/components/explorer/empty-state";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { ThreadNode } from "@/components/thread/thread-node";
import { buildReplyTree, type ReplyNode } from "@/lib/notes/thread-tree";
import type { EventRecord, Profile } from "@/lib/types/api";

/** Server-renderable reply list; also used by the "Show more replies" action. */
export function ThreadReplies({
  nodes,
  authorsByPubkey,
  contentResolution,
}: {
  nodes: ReplyNode[];
  authorsByPubkey?: Record<string, Profile>;
  contentResolution?: NoteContentResolution;
}) {
  if (nodes.length === 0) return null;
  return (
    <ul className="space-y-1">
      {nodes.map((node, index) => (
        <ThreadNode
          key={node.reply.id ?? `reply-${index}`}
          node={node}
          authorsByPubkey={authorsByPubkey}
          contentResolution={contentResolution}
        />
      ))}
    </ul>
  );
}

/**
 * Replies to the focal note, one level threaded. Ancestors are rendered
 * separately above the focal note (see `ThreadAncestors`).
 */
export function ThreadView({
  focalEventId,
  replies,
  authorsByPubkey,
  contentResolution,
  /** In-place pagination control rendered after the first page. */
  continuation,
  emptyMessage = "No replies have been indexed for this note yet.",
}: {
  focalEventId: string;
  replies: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
  contentResolution?: NoteContentResolution;
  continuation?: ReactNode;
  emptyMessage?: string;
}) {
  const nodes = buildReplyTree(replies, focalEventId);

  if (nodes.length === 0 && !continuation) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="space-y-3">
      <ThreadReplies
        nodes={nodes}
        authorsByPubkey={authorsByPubkey}
        contentResolution={contentResolution}
      />
      {continuation}
    </div>
  );
}
