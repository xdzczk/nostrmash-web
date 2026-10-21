"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";

import { EnlargeableImage } from "@/components/ui/image-lightbox";

type MediaKind = "image" | "video" | "audio";

/** Media fragment that encourages browsers to paint an early frame. */
export function videoPreviewSrc(url: string): string {
  const hashIndex = url.indexOf("#");
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  return `${base}#t=0.001`;
}

function NoteVideo({ url, fill = false }: { url: string; fill?: boolean }) {
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
      className={fill ? "h-full w-full bg-black object-cover" : "max-h-[28rem] w-full bg-black"}
    />
  );
}

export function NoteMediaReveal({
  url,
  kind,
  variant = "full",
  priority = false,
  hiddenCount = 0,
}: {
  url: string;
  kind: MediaKind;
  variant?: "full" | "lead" | "compact";
  /** Eager-load with high fetch priority (lead/LCP image). */
  priority?: boolean;
  /** Number of further attachments not rendered; shown as a `+N` badge. */
  hiddenCount?: number;
}) {
  // Fixed-ratio variants reserve their box before the image loads (no CLS).
  // Compact is a square thumbnail beside the text until `lg`, then a strip.
  const fixedRatio =
    variant === "compact"
      ? "aspect-square lg:aspect-[16/10]"
      : variant === "lead"
        ? "aspect-[16/10]"
        : "";
  const fill = fixedRatio.length > 0;
  const badge =
    hiddenCount > 0 ? (
      <span
        className="bg-surface/90 text-ink border-edge pointer-events-none absolute right-2 bottom-2 z-[3] rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums backdrop-blur-sm"
        aria-label={`${hiddenCount} more ${hiddenCount === 1 ? "attachment" : "attachments"}`}
      >
        +{hiddenCount}
      </span>
    ) : null;

  return (
    <div
      className={`border-edge bg-surface-sunken/60 relative overflow-hidden rounded-[var(--radius-control)] border ${fixedRatio}`}
    >
      {kind === "image" ? (
        <EnlargeableImage
          src={url}
          alt="Image attached to note"
          className={`block w-full cursor-zoom-in ${fill ? "h-full" : ""}`}
        >
          <img
            src={url}
            alt="Image attached to note"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            referrerPolicy="no-referrer"
            className={
              fill
                ? "h-full w-full object-cover"
                : // Natural ratio, letterboxed when tall: screenshots stay legible.
                  "max-h-[40rem] w-full object-contain"
            }
          />
        </EnlargeableImage>
      ) : null}
      {kind === "video" ? <NoteVideo url={url} fill={fill} /> : null}
      {kind === "audio" ? (
        <div className={fill ? "flex h-full items-center p-3" : "p-3"}>
          <audio src={url} controls preload="metadata" className="w-full" />
        </div>
      ) : null}
      {badge}
    </div>
  );
}
