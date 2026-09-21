"use client";

import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

export type LoadMoreChunk = {
  /** Server-rendered list markup for the next page (RSC payload). */
  content: ReactNode;
  /** Continuation token for the page after this one, if any. */
  nextCursor?: string;
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
}: {
  initialCursor: string;
  loadMore: (cursor: string) => Promise<LoadMoreChunk>;
  label?: string;
  pendingLabel?: string;
}) {
  const [chunks, setChunks] = useState<ReactNode[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
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

  return (
    <>
      {chunks.map((chunk, index) => (
        <div key={index} className="min-w-0">
          {chunk}
        </div>
      ))}
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
