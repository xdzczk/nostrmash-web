"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

type MediaKind = "image" | "video" | "audio";

export function NoteMediaReveal({
  url,
  kind,
  displayUrl,
}: {
  url: string;
  kind: MediaKind;
  displayUrl: string;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <div className="border-edge bg-surface-sunken/45 rounded-lg border px-4 py-4">
        <p className="text-ink text-sm font-medium">External {kind} hidden</p>
        <p className="text-ink-muted mt-1 text-xs leading-5">
          Media can expose your IP address to {displayUrl}. Reveal it only if you trust the source.
        </p>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="text-ink hover:text-accent-ink mt-3 inline-flex min-h-11 items-center text-sm font-medium underline decoration-[var(--accent-soft)] underline-offset-4"
        >
          Reveal {kind}
        </button>
      </div>
    );
  }

  return (
    <div className="border-edge bg-surface-sunken/60 overflow-hidden rounded-lg border">
      {kind === "image" ? (
        <img
          src={url}
          alt="Image attached to note"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="max-h-[28rem] w-full object-cover"
        />
      ) : null}
      {kind === "video" ? (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="max-h-[28rem] w-full bg-black"
        />
      ) : null}
      {kind === "audio" ? (
        <div className="p-3">
          <audio src={url} controls preload="metadata" className="w-full" />
        </div>
      ) : null}
      <div className="border-edge text-ink-muted flex items-center justify-between gap-3 border-t px-3 py-2 text-xs">
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          title={url}
          referrerPolicy="no-referrer"
          className="hover:text-ink-soft truncate"
        >
          {displayUrl}
        </a>
        <button
          type="button"
          onClick={() => setRevealed(false)}
          className="hover:text-ink shrink-0"
        >
          Hide
        </button>
      </div>
    </div>
  );
}
