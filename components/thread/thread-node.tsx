import Link from "next/link";

import { EventReadingSurface } from "@/components/explorer/event-reading-surface";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { lookupProfileByPubkey, profileHref, profileLabel } from "@/components/explorer/utils";
import type { ReplyNode } from "@/lib/notes/thread-tree";
import type { EventRecord, Profile } from "@/lib/types/api";

export function getAuthorByPubkey(
  authorsByPubkey: Record<string, Profile> | undefined,
  pubkey: unknown
): Profile | undefined {
  if (!authorsByPubkey || typeof pubkey !== "string") return undefined;
  const normalized = pubkey.trim().toLowerCase();
  return authorsByPubkey[normalized] ?? authorsByPubkey[pubkey];
}

/** Context line above a reply: who it addresses and whether it was folded. */
function ReplyContext({
  replyingToPubkey,
  duplicateCount,
  resolution,
  authorsByPubkey,
}: {
  replyingToPubkey?: string;
  duplicateCount: number;
  resolution?: NoteContentResolution;
  authorsByPubkey?: Record<string, Profile>;
}) {
  if (!replyingToPubkey && duplicateCount <= 1) return null;
  const profile = replyingToPubkey
    ? (getAuthorByPubkey(authorsByPubkey, replyingToPubkey) ??
      lookupProfileByPubkey(replyingToPubkey, resolution?.profilesByPubkey))
    : undefined;
  const label = replyingToPubkey
    ? profile
      ? profileLabel(profile)
      : `${replyingToPubkey.slice(0, 8)}…`
    : null;
  const href = replyingToPubkey ? profileHref(profile, replyingToPubkey) : undefined;
  return (
    <p className="text-ink-dim flex flex-wrap items-center gap-x-1.5 pt-3 text-[13px]">
      {replyingToPubkey ? (
        <>
          <span aria-hidden>↳</span>
          <span>replying to</span>
          {href ? (
            <Link
              href={href}
              className="text-ink-soft inline-flex min-h-6 items-center hover:underline"
            >
              @{label}
            </Link>
          ) : (
            <span className="text-ink-soft">@{label}</span>
          )}
        </>
      ) : null}
      {duplicateCount > 1 ? (
        <span
          className="border-edge-strong text-ink-soft inline-flex min-h-6 items-center gap-1 rounded-md border px-1.5 tabular-nums"
          title={`${duplicateCount} identical replies from this author were folded into one`}
        >
          ×{duplicateCount}
          <span className="text-ink-dim font-normal">posted {duplicateCount} times</span>
        </span>
      ) : null}
    </p>
  );
}

/** One reply, with its one level of nested children. */
export function ThreadNode({
  node,
  authorsByPubkey,
  contentResolution,
  depth = 0,
}: {
  node: ReplyNode;
  authorsByPubkey?: Record<string, Profile>;
  contentResolution?: NoteContentResolution;
  depth?: number;
}) {
  const { reply, children, duplicateCount, replyingToPubkey } = node;
  return (
    <li className="min-w-0">
      <article aria-label={depth === 0 ? "Reply" : "Nested reply"}>
        <ReplyContext
          replyingToPubkey={replyingToPubkey}
          duplicateCount={duplicateCount}
          resolution={contentResolution}
          authorsByPubkey={authorsByPubkey}
        />
        <EventReadingSurface
          event={reply}
          author={getAuthorByPubkey(authorsByPubkey, reply.pubkey)}
          contentResolution={contentResolution}
          density="reply"
        />
      </article>
      {children.length > 0 ? (
        <ul className="border-edge/70 mt-1 ml-3 space-y-1 border-l-2 pl-3 sm:ml-5 sm:pl-4">
          {children.map((child, index) => (
            <ThreadNode
              key={child.reply.id ?? `child-${index}`}
              node={child}
              authorsByPubkey={authorsByPubkey}
              contentResolution={contentResolution}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Ancestors rendered as a connected rail above the focal note. */
export function ThreadAncestors({
  ancestors,
  authorsByPubkey,
  contentResolution,
}: {
  ancestors: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
  contentResolution?: NoteContentResolution;
}) {
  if (ancestors.length === 0) return null;
  return (
    <ol aria-label="Earlier in this thread" className="border-edge/70 ml-5 border-l-2 pl-4 sm:ml-6">
      {ancestors.map((ancestor, index) => (
        <li key={ancestor.id ?? `ancestor-${index}`} className="min-w-0">
          <EventReadingSurface
            event={ancestor}
            author={getAuthorByPubkey(authorsByPubkey, ancestor.pubkey)}
            contentResolution={contentResolution}
            density="reply"
          />
        </li>
      ))}
    </ol>
  );
}
