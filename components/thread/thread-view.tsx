import Link from "next/link";

import { EmptyState } from "@/components/explorer/empty-state";
import { ThreadNode } from "@/components/thread/thread-node";
import type { EventRecord, Profile } from "@/lib/types/api";

function getAuthorByPubkey(
  authorsByPubkey: Record<string, Profile> | undefined,
  pubkey: unknown
): Profile | undefined {
  if (!authorsByPubkey || typeof pubkey !== "string") return undefined;
  const normalized = pubkey.trim().toLowerCase();
  return authorsByPubkey[normalized] ?? authorsByPubkey[pubkey];
}

export function ThreadView({
  ancestors,
  focal,
  replies,
  missingAncestorIds = [],
  nextCursor,
  continuationHref,
  continuationLabel = "Load next replies",
  authorsByPubkey,
}: {
  ancestors: EventRecord[];
  focal?: EventRecord;
  replies: EventRecord[];
  missingAncestorIds?: string[];
  nextCursor?: string;
  continuationHref?: string;
  continuationLabel?: string;
  authorsByPubkey?: Record<string, Profile>;
}) {
  if (!focal && ancestors.length === 0 && replies.length === 0) {
    return <EmptyState title="No thread data" message="No ancestors or replies were returned." />;
  }

  return (
    <div className="space-y-5">
      {missingAncestorIds.length > 0 ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs break-all text-amber-200">
            Missing ancestors: {missingAncestorIds.slice(0, 4).join(", ")}
            {missingAncestorIds.length > 4 ? ` +${missingAncestorIds.length - 4} more` : ""}
          </p>
        </div>
      ) : null}

      {ancestors.length > 0 ? (
        <section className="space-y-3">
          <p className="text-ink-dim text-sm font-medium">Ancestors</p>
          <div className="space-y-3">
            {ancestors.map((ancestor, index) => (
              <ThreadNode
                key={ancestor.id ?? `ancestor-${index}`}
                note={ancestor}
                author={getAuthorByPubkey(authorsByPubkey, ancestor.pubkey)}
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
            author={getAuthorByPubkey(authorsByPubkey, focal.pubkey)}
            role="focal"
          />
        </section>
      ) : null}

      {replies.length > 0 ? (
        <section className="space-y-3">
          <p className="text-ink-dim text-sm font-medium">Replies</p>
          <div className="space-y-3">
            {replies.map((reply, index) => (
              <ThreadNode
                key={reply.id ?? `reply-${index}`}
                note={reply}
                author={getAuthorByPubkey(authorsByPubkey, reply.pubkey)}
                role="reply"
              />
            ))}
          </div>
        </section>
      ) : null}

      {typeof nextCursor === "string" && nextCursor.length > 0 ? (
        <div className="border-accent/30 bg-accent/10 rounded-md border p-3">
          <p className="text-accent-ink text-xs">More replies are available.</p>
          {continuationHref ? (
            <Link
              href={continuationHref}
              className="border-accent/40 text-link-hover hover:text-accent-ink mt-2 inline-block rounded-full border px-3 py-1 text-xs"
            >
              {continuationLabel}
            </Link>
          ) : null}
          <p className="text-link/80 mt-2 text-xs break-all">cursor: {nextCursor}</p>
        </div>
      ) : null}
    </div>
  );
}
