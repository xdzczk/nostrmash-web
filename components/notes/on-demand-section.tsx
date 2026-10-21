"use client";

import { useState, useTransition, type ReactNode } from "react";

import { LoadMoreList, type LoadMoreChunk } from "@/components/data/load-more-list";
import { Button } from "@/components/ui/button";

type Status =
  | { kind: "idle" }
  | { kind: "loaded"; content: ReactNode; nextCursor?: string }
  | { kind: "empty" }
  | { kind: "error" };

/**
 * A section whose content is fetched only when the reader asks for it. The
 * first click calls the bound server action with no cursor; further pages go
 * through `LoadMoreList`. Nothing navigates, so scroll position is kept.
 */
export function OnDemandSection({
  load,
  label,
  pendingLabel = "Loading…",
  emptyMessage = "Nothing to show yet.",
  moreLabel = "Show more",
  hint,
}: {
  load: (cursor: string | null) => Promise<LoadMoreChunk>;
  label: string;
  pendingLabel?: string;
  emptyMessage?: string;
  moreLabel?: string;
  /** Short neutral description shown next to the button before loading. */
  hint?: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const handleLoad = () => {
    startTransition(async () => {
      try {
        const chunk = await load(null);
        if (!chunk.content) {
          setStatus({ kind: "empty" });
          return;
        }
        setStatus({
          kind: "loaded",
          content: chunk.content,
          nextCursor:
            typeof chunk.nextCursor === "string" && chunk.nextCursor.length > 0
              ? chunk.nextCursor
              : undefined,
        });
      } catch {
        setStatus({ kind: "error" });
      }
    });
  };

  if (status.kind === "loaded") {
    return (
      <div className="space-y-1">
        <div className="min-w-0">{status.content}</div>
        {status.nextCursor ? (
          <LoadMoreList
            initialCursor={status.nextCursor}
            loadMore={(cursor) => load(cursor)}
            label={moreLabel}
            pendingLabel={pendingLabel}
          />
        ) : null}
      </div>
    );
  }

  if (status.kind === "empty") {
    return <p className="text-ink-dim text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="chip" size="sm" disabled={isPending} onClick={handleLoad}>
        {isPending ? pendingLabel : label}
      </Button>
      {status.kind === "error" ? (
        <p className="text-danger text-xs">Couldn&apos;t load. Try again.</p>
      ) : hint ? (
        <p className="text-ink-dim text-sm">{hint}</p>
      ) : null}
    </div>
  );
}
