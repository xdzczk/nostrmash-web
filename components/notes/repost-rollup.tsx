"use client";

import { useState, useTransition, type ReactNode } from "react";

import type { LoadMoreChunk } from "@/components/data/load-more-list";
import { engagementAccessibleName, RepostIcon } from "@/components/explorer/post-engagement";

/**
 * The Reposts stat on the focal note. The first click loads who reposted it
 * and replaces the bare count with "Reposted by A, B, and N others".
 */
export function RepostRollup({
  count,
  quoteCount = 0,
  load,
}: {
  count: number;
  /** Quote posts included in `count`. */
  quoteCount?: number;
  load: () => Promise<LoadMoreChunk>;
}) {
  const [content, setContent] = useState<ReactNode>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const open = content !== null;
  const label = engagementAccessibleName({
    label: "repost_count",
    value: count,
    ...(quoteCount > 0 ? { quoteCount } : {}),
  });

  const handleClick = () => {
    if (open || isPending) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const result = await load();
        setContent(result.content ?? <span>No reposts have been indexed yet.</span>);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="text-ink-soft hover:text-ink inline-flex min-h-6 items-center gap-1.5 rounded-sm font-medium disabled:opacity-70"
      >
        <span aria-hidden className="text-ink-faint inline-flex">
          <RepostIcon />
        </span>
        <span aria-hidden className="tabular-nums">
          {isPending ? "…" : count.toLocaleString()}
        </span>
      </button>
      {open ? <span className="text-ink-dim order-1 basis-full font-normal">{content}</span> : null}
      {failed ? (
        <span className="text-danger order-1 basis-full text-xs">Couldn&apos;t load reposts.</span>
      ) : null}
    </>
  );
}
