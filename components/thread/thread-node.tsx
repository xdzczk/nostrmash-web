import Link from "next/link";

import type { LoadMoreChunk } from "@/components/data/load-more-list";
import { OnDemandSection } from "@/components/notes/on-demand-section";
import { EventReadingSurface } from "@/components/explorer/event-reading-surface";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { AncestorReveal } from "@/components/thread/ancestor-reveal";
import { FocusFocalNote } from "@/components/thread/focus-focal-note";
import { lookupProfileByPubkey, profileHref, profileLabel } from "@/components/explorer/utils";
import type { ReplyNode } from "@/lib/notes/thread-tree";
import type { EventRecord, Profile } from "@/lib/types/api";

export type LoadDirectReplies = (
  eventId: string,
  flattenUnderPubkey: string,
  cursor: string | null
) => Promise<LoadMoreChunk>;

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
        <span className="border-edge-strong text-ink-soft inline-flex min-h-6 items-center rounded-md border px-1.5 tabular-nums">
          {duplicateCount.toLocaleString()} identical replies
        </span>
      ) : null}
    </p>
  );
}

/** One reply, with its one level of nested children. */
function replyCountOf(event: EventRecord): number {
  return typeof event.reply_count === "number" && event.reply_count > 0 ? event.reply_count : 0;
}

export function ThreadNode({
  node,
  authorsByPubkey,
  contentResolution,
  loadDirectReplies,
  depth = 0,
}: {
  node: ReplyNode;
  authorsByPubkey?: Record<string, Profile>;
  contentResolution?: NoteContentResolution;
  loadDirectReplies?: LoadDirectReplies;
  depth?: number;
}) {
  const { reply, children, duplicateCount, replyingToPubkey } = node;
  const replyCount = replyCountOf(reply);
  const replyId = typeof reply.id === "string" ? reply.id : "";
  // The replies API returns only direct children, so a count with nothing
  // nested in this payload is a branch the reader can open here.
  const canExpand =
    Boolean(loadDirectReplies) && replyId.length > 0 && children.length === 0 && replyCount > 0;
  const flattenUnder = depth === 0 ? "" : typeof reply.pubkey === "string" ? reply.pubkey : "";
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
        <ul className="border-ink-faint mt-1 ml-5 space-y-1 border-l pl-3 sm:ml-6">
          {children.map((child, index) => (
            <ThreadNode
              key={child.reply.id ?? `child-${index}`}
              node={child}
              authorsByPubkey={authorsByPubkey}
              contentResolution={contentResolution}
              loadDirectReplies={loadDirectReplies}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
      {canExpand && loadDirectReplies ? (
        <div className="mt-1">
          <OnDemandSection
            load={loadDirectReplies.bind(null, replyId, flattenUnder)}
            label={
              replyCount === 1 ? "Show 1 reply" : `Show ${replyCount.toLocaleString()} replies`
            }
            collapsible
            hideLabel={replyCount === 1 ? "Hide reply" : "Hide replies"}
            pendingLabel="Loading replies…"
            moreLabel="Show more replies"
            emptyMessage="No replies have been indexed for this note yet."
            contentClassName={
              depth === 0 ? "border-ink-faint ml-5 border-l pl-3 sm:ml-6" : undefined
            }
          />
        </div>
      ) : null}
    </li>
  );
}

function AncestorItem({
  event,
  authorsByPubkey,
  contentResolution,
  connectAbove = false,
  bridgeToNote = false,
}: {
  event: EventRecord;
  authorsByPubkey?: Record<string, Profile>;
  contentResolution?: NoteContentResolution;
  /** Continue the line from the ancestor above. The first one in the chain starts it. */
  connectAbove?: boolean;
  /** Reach across the gap so the line meets the open note's avatar. */
  bridgeToNote?: boolean;
}) {
  return (
    <li className="min-w-0">
      <EventReadingSurface
        event={event}
        author={getAuthorByPubkey(authorsByPubkey, event.pubkey)}
        contentResolution={contentResolution}
        density="reply"
        connectAbove={connectAbove}
        connectBelow
        bridgeToNote={bridgeToNote}
      />
    </li>
  );
}

/**
 * Ancestors above the open note. A line runs through their avatar gutter
 * down to that note, and stops there. Sibling replies are not on the line.
 */
export function ThreadAncestors({
  ancestors,
  authorsByPubkey,
  contentResolution,
  missingCount = 0,
}: {
  ancestors: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
  contentResolution?: NoteContentResolution;
  missingCount?: number;
}) {
  if (ancestors.length === 0 && missingCount === 0) return null;
  const shared = { authorsByPubkey, contentResolution };
  const collapsed = ancestors.length > 2;
  const hidden = collapsed ? ancestors.slice(1, -1) : [];
  const visible = collapsed ? [ancestors[0]!, ancestors[ancestors.length - 1]!] : ancestors;
  return (
    <>
      <ol aria-label="Earlier in this thread">
        {collapsed ? (
          <>
            <AncestorItem event={visible[0]!} {...shared} />
            <AncestorReveal count={hidden.length} missing={missingCount > 0}>
              <ol>
                {hidden.map((ancestor, index) => (
                  <AncestorItem
                    key={ancestor.id ?? `hidden-${index}`}
                    event={ancestor}
                    connectAbove
                    {...shared}
                  />
                ))}
              </ol>
            </AncestorReveal>
            <AncestorItem event={visible[1]!} connectAbove bridgeToNote {...shared} />
          </>
        ) : (
          ancestors.map((ancestor, index) => (
            <AncestorItem
              key={ancestor.id ?? `ancestor-${index}`}
              event={ancestor}
              connectAbove={index > 0}
              bridgeToNote={index === ancestors.length - 1}
              {...shared}
            />
          ))
        )}
      </ol>
      {missingCount > 0 && !collapsed ? (
        <p className="text-ink-dim py-2 text-[13px]">Some earlier notes aren&apos;t indexed.</p>
      ) : null}
      <FocusFocalNote />
    </>
  );
}
