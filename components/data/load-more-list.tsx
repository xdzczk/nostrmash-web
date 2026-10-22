"use client";

import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { formatUnindexedReplyLine, unindexedReplyCount } from "@/lib/notes/reply-gap";

export type LoadMoreChunk = {
  /** Server-rendered list markup for the next page (RSC payload). */
  content: ReactNode;
  /** Continuation token for the page after this one, if any. */
  nextCursor?: string;
  /** Replies this page accounts for, including branches the reader can still open. */
  indexedCount?: number;
};

/**
 * Appends server-rendered list pages in place. The server page renders the
 * first page and passes a bound server action; each click fetches the next
 * cursor page, appends its markup below what the reader already scrolled
 * through, and advances the cursor. No navigation happens, so the route's
 * loading boundary never swaps the document and scroll position is kept.
 */
export function LoadMoreList({
  initialCursor,
  loadMore,
  label = "Show more",
  pendingLabel = "Loading more…",
  indexedSoFar,
  reportedReplyCount,
}: {
  initialCursor: string;
  loadMore: (cursor: string) => Promise<LoadMoreChunk>;
  label?: string;
  pendingLabel?: string;
  /** Replies already accounted for before this control, including openable branches. */
  indexedSoFar?: number;
  /** Index total for the note. The gap is shown once every page has been loaded. */
  reportedReplyCount?: number;
}) {
  const [chunks, setChunks] = useState<ReactNode[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [loadedExtra, setLoadedExtra] = useState(0);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = () => {
    const currentCursor = cursor;
    if (!currentCursor) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const next = await loadMore(currentCursor);
        setChunks((previous) => [...previous, next.content]);
        setLoadedExtra((previous) => previous + (next.indexedCount ?? 0));
        setCursor(
          typeof next.nextCursor === "string" && next.nextCursor.length > 0
            ? next.nextCursor
            : undefined
        );
      } catch {
        setFailed(true);
      }
    });
  };

  const missingLine =
    !cursor && typeof reportedReplyCount === "number"
      ? formatUnindexedReplyLine(
          unindexedReplyCount((indexedSoFar ?? 0) + loadedExtra, reportedReplyCount)
        )
      : null;

  return (
    <>
      {chunks.map((chunk, index) => (
        <div key={index} className="min-w-0">
          {chunk}
        </div>
      ))}
      {missingLine ? <p className="text-ink-dim py-2 text-[13px]">{missingLine}</p> : null}
      {cursor ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="chip" size="sm" disabled={isPending} onClick={handleLoadMore}>
            {isPending ? pendingLabel : label}
          </Button>
          {failed ? <p className="text-danger text-xs">Loading more failed. Try again.</p> : null}
        </div>
      ) : null}
    </>
  );
}
