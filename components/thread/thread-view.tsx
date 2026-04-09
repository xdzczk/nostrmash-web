import { EmptyState } from "@/components/explorer/empty-state";
import { ThreadNode } from "@/components/thread/thread-node";
import type { EventRecord } from "@/lib/types/api";

export function ThreadView({
  ancestors,
  focal,
  replies,
}: {
  ancestors: EventRecord[];
  focal?: EventRecord;
  replies: EventRecord[];
}) {
  if (!focal && ancestors.length === 0 && replies.length === 0) {
    return <EmptyState title="No thread data" message="No ancestors or replies were returned." />;
  }

  return (
    <div className="space-y-5">
      {ancestors.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Ancestors</p>
          <div className="space-y-3">
            {ancestors.map((ancestor, index) => (
              <ThreadNode
                key={ancestor.id ?? `ancestor-${index}`}
                note={ancestor}
                role="ancestor"
              />
            ))}
          </div>
        </section>
      ) : null}

      {focal ? (
        <section>
          <ThreadNode note={focal} role="focal" />
        </section>
      ) : null}

      {replies.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Replies</p>
          <div className="space-y-3">
            {replies.map((reply, index) => (
              <ThreadNode key={reply.id ?? `reply-${index}`} note={reply} role="reply" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
