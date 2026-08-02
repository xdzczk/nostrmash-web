"use client";

/* eslint-disable @next/next/no-img-element */

type MediaKind = "image" | "video" | "audio";

export function NoteMediaReveal({ url, kind }: { url: string; kind: MediaKind }) {
  return (
    <div className="border-edge bg-surface-sunken/60 overflow-hidden rounded-[var(--radius-control)] border">
      {kind === "image" ? (
        <a href={url} target="_blank" rel="noreferrer noopener" referrerPolicy="no-referrer">
          <img
            src={url}
            alt="Image attached to note"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-h-[28rem] w-full object-cover"
          />
        </a>
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
    </div>
  );
}
