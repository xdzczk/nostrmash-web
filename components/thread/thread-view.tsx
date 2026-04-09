import { EmptyState } from "@/components/explorer/empty-state";
import { ThreadNode } from "@/components/thread/thread-node";
import type { EventRecord, Profile } from "@/lib/types/api";

export function ThreadView({
  ancestors,
  focal,
  replies,
  missingAncestorIds = [],
  nextCursor,
  authorsByPubkey,
}: {
  ancestors: EventRecord[];
  focal?: EventRecord;
  replies: EventRecord[];
  missingAncestorIds?: string[];
  nextCursor?: string;
  authorsByPubkey?: Record<string, Profile>;
}) {
  if (!focal && ancestors.length === 0 && replies.length === 0) {
    return <EmptyState title="No thread data" message="No ancestors or replies were returned." />;
  }

  return (
    <div className="space-y-5">
      {missingAncestorIds.length > 0 ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-200">
            Missing ancestors: {missingAncestorIds.slice(0, 4).join(", ")}
            {missingAncestorIds.length > 4 ? ` +${missingAncestorIds.length - 4} more` : ""}
          </p>
        </div>
      ) : null}

      {ancestors.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Ancestors</p>
          <div className="space-y-3">
            {ancestors.map((ancestor, index) => (
              <ThreadNode
                key={ancestor.id ?? `ancestor-${index}`}
                note={ancestor}
                author={
                  typeof ancestor.pubkey === "string"
                    ? authorsByPubkey?.[ancestor.pubkey]
                    : undefined
                }
                role="ancestor"
              />
            ))}
          </div>
        </section>
      ) : null}

      {focal ? (
        <section>
          <ThreadNode
            note={focal}
            author={typeof focal.pubkey === "string" ? authorsByPubkey?.[focal.pubkey] : undefined}
            role="focal"
          />
        </section>
      ) : null}

      {replies.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Replies</p>
          <div className="space-y-3">
            {replies.map((reply, index) => (
              <ThreadNode
                key={reply.id ?? `reply-${index}`}
                note={reply}
                author={
                  typeof reply.pubkey === "string" ? authorsByPubkey?.[reply.pubkey] : undefined
                }
                role="reply"
              />
            ))}
          </div>
        </section>
      ) : null}

      {typeof nextCursor === "string" && nextCursor.length > 0 ? (
        <p className="text-xs text-zinc-500">
          Thread has additional replies available (next_cursor present): {nextCursor}
        </p>
      ) : null}
    </div>
  );
}
