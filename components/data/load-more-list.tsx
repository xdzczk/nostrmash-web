"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

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
  auto = false,
}: {
  initialCursor: string;
  loadMore: (cursor: string) => Promise<LoadMoreChunk>;
  label?: string;
  pendingLabel?: string;
  /** Replies already accounted for before this control, including openable branches. */
  indexedSoFar?: number;
  /** Index total for the note. The gap is shown once every page has been loaded. */
  reportedReplyCount?: number;
  /** Fetch the next page when this control nears the viewport. */
  auto?: boolean;
}) {
  const [chunks, setChunks] = useState<ReactNode[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [loadedExtra, setLoadedExtra] = useState(0);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const cursorRef = useRef(cursor);
  const loadMoreRef = useRef(loadMore);
  // A render while a page is in flight still has the previous cursor in state.
  // Leave the ref on the cursor that request captured until that request finishes.
  if (!inFlight.current) cursorRef.current = cursor;
  loadMoreRef.current = loadMore;

  const requestNext = useCallback(() => {
    const currentCursor = cursorRef.current;
    if (!currentCursor || inFlight.current) return;
    inFlight.current = true;
    setFailed(false);
    startTransition(async () => {
      try {
        const next = await loadMoreRef.current(currentCursor);
        const hasContent = next.content != null;
        const nextCursor =
          hasContent && typeof next.nextCursor === "string" && next.nextCursor.length > 0
            ? next.nextCursor
            : undefined;
        cursorRef.current = nextCursor;
        if (hasContent) {
          setChunks((previous) => [...previous, next.content]);
          setLoadedExtra((previous) => previous + (next.indexedCount ?? 0));
        }
        setCursor(nextCursor);
      } catch {
        setFailed(true);
      } finally {
        inFlight.current = false;
      }
    });
  }, [startTransition]);

  useEffect(() => {
    if (!auto || !cursor || failed) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) requestNext();
      },
      { rootMargin: "640px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [auto, cursor, failed, requestNext]);

  const missingLine =
    !cursor && typeof reportedReplyCount === "number"
      ? formatUnindexedReplyLine(
          unindexedReplyCount((indexedSoFar ?? 0) + loadedExtra, reportedReplyCount)
        )
      : null;

  return (
    <>
      {chunks.map((chunk, index) => (
        // The chunk is a server-rendered payload that can suspend while its
        // flight data resolves. A boundary here keeps that wait off the route
        // loading UI, which would otherwise swap the whole page out and pull
        // the reader back up the list.
        <Suspense key={index} fallback={null}>
          <div className="min-w-0">{chunk}</div>
        </Suspense>
      ))}
      {missingLine ? <p className="text-ink-dim py-2 text-[13px]">{missingLine}</p> : null}
      {cursor ? (
        <div ref={sentinelRef} className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="chip" size="sm" disabled={isPending} onClick={requestNext}>
            {isPending ? pendingLabel : label}
          </Button>
          {failed ? <p className="text-danger text-xs">Loading more failed. Try again.</p> : null}
        </div>
      ) : null}
    </>
  );
}
