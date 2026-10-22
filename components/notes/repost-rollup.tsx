"use client";

import { useState, useTransition, type ReactNode } from "react";

import type { LoadMoreChunk } from "@/components/data/load-more-list";

/**
 * The Reposts stat on the focal note. The first click loads who reposted it
 * and replaces the bare count with "Reposted by A, B, and N others".
 */
export function RepostRollup({
  count,
  load,
}: {
  count: number;
  load: () => Promise<LoadMoreChunk>;
}) {
  const [content, setContent] = useState<ReactNode>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const open = content !== null;

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
        className="text-ink-soft hover:text-ink inline-flex min-h-6 items-center gap-1.5 rounded-sm font-medium hover:underline disabled:opacity-70"
      >
        <span className="text-ink-faint font-normal">Reposts</span>
        {isPending ? "…" : count.toLocaleString()}
      </button>
      {open ? <span className="text-ink-dim basis-full font-normal">{content}</span> : null}
      {failed ? (
        <span className="text-danger basis-full text-xs">Couldn&apos;t load reposts.</span>
      ) : null}
    </>
  );
}
