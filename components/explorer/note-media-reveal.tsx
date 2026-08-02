"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";

type MediaKind = "image" | "video" | "audio";

/** Media fragment that encourages browsers to paint an early frame. */
export function videoPreviewSrc(url: string): string {
  const hashIndex = url.indexOf("#");
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  return `${base}#t=0.001`;
}

function NoteVideo({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const primedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const primeFrame = () => {
      if (primedUrlRef.current === url) return;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const target = duration > 0 ? Math.min(0.1, Math.max(duration * 0.01, 0.001)) : 0.1;
      try {
        video.currentTime = target;
        primedUrlRef.current = url;
      } catch {
        // Some sources reject seeks before enough data arrives; ignore.
      }
    };

    if (video.readyState >= 1) {
      primeFrame();
    }

    video.addEventListener("loadedmetadata", primeFrame);
    return () => {
      video.removeEventListener("loadedmetadata", primeFrame);
    };
  }, [url]);

  return (
    <video
      ref={videoRef}
      src={videoPreviewSrc(url)}
      controls
      playsInline
      preload="metadata"
      className="max-h-[28rem] w-full bg-black"
    />
  );
}

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
      {kind === "video" ? <NoteVideo url={url} /> : null}
      {kind === "audio" ? (
        <div className="p-3">
          <audio src={url} controls preload="metadata" className="w-full" />
        </div>
      ) : null}
    </div>
  );
}
