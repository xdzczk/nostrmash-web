import { EmptyState } from "@/components/explorer/empty-state";
import { ThreadNode } from "@/components/thread/thread-node";
import type { EventRecord, Profile } from "@/lib/types/api";

export function ThreadView({
  ancestors,
  focal,
  replies,
  authorsByPubkey,
}: {
  ancestors: EventRecord[];
  focal?: EventRecord;
  replies: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
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
    </div>
  );
}
