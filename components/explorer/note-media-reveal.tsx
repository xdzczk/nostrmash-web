"use client";

import { useEffect, useRef } from "react";

import { BlossomImage } from "@/components/ui/blossom-image";
import { EnlargeableImage } from "@/components/ui/image-lightbox";

type MediaKind = "image" | "video" | "audio";

/** Media fragment that encourages browsers to paint an early frame. */
export function videoPreviewSrc(url: string): string {
  const hashIndex = url.indexOf("#");
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  return `${base}#t=0.001`;
}

function listen(target: EventTarget, type: string, handler: () => void) {
  target.addEventListener(type, handler);
  return () => target.removeEventListener(type, handler);
}

function NoteVideo({ url, className }: { url: string; className: string }) {
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncFullscreen = () => {
      const webkitVideo = video as HTMLVideoElement & { webkitDisplayingFullscreen?: boolean };
      const active =
        document.fullscreenElement === video || webkitVideo.webkitDisplayingFullscreen === true;
      video.toggleAttribute("data-native-fullscreen", active);
    };

    const unsubscribers = [
      listen(document, "fullscreenchange", syncFullscreen),
      listen(video, "webkitbeginfullscreen", syncFullscreen),
      listen(video, "webkitendfullscreen", syncFullscreen),
    ];
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
      video.removeAttribute("data-native-fullscreen");
    };
  }, [url]);

  return (
    <video
      ref={videoRef}
      src={videoPreviewSrc(url)}
      controls
      playsInline
      preload="metadata"
      className={className}
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
  variant?: "full" | "lead" | "compact" | "feed" | "detail" | "thread";
  /** Eager-load with high fetch priority (lead/LCP image). */
  priority?: boolean;
  /** Number of further attachments not rendered; shown as a `+N` badge. */
  hiddenCount?: number;
}) {
  // Fixed-ratio variants reserve their box before the image loads (no CLS).
  // Compact is a square thumbnail at every width so a screenshot stays a thumb.
  const fixedRatio =
    variant === "compact" ? "aspect-square" : variant === "lead" ? "aspect-[16/10]" : "";
  const fill = fixedRatio.length > 0;
  // Other variants keep the file's aspect ratio. A full-width box plus a short
  // max-height letterboxes portrait photos down to a thin strip.
  const limitClass =
    variant === "feed"
      ? "max-h-[28rem]"
      : variant === "thread"
        ? "max-h-48"
        : variant === "detail"
          ? "max-h-[min(44rem,78vh)]"
          : "max-h-[min(40rem,75vh)]";
  const intrinsicClass = `${limitClass} h-auto w-auto max-w-full object-contain`;
  const framedClass = fill ? "h-full w-full object-cover" : intrinsicClass;
  // Videos always contain the frame. Cover on a fixed card survives native
  // fullscreen and cuts off portrait video.
  const videoClass = fill
    ? "nm-media-video h-full w-full bg-black object-contain"
    : `nm-media-video ${intrinsicClass} bg-black`;
  const badge =
    hiddenCount > 0 ? (
      <span
        className="bg-surface/90 text-ink border-edge pointer-events-none absolute right-2 bottom-2 z-[3] rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums backdrop-blur-sm"
        aria-label={`${hiddenCount} more ${hiddenCount === 1 ? "attachment" : "attachments"}`}
      >
        +{hiddenCount}
      </span>
    ) : null;

  const frameWidthClass = fill ? fixedRatio : kind === "audio" ? "w-full" : "w-fit max-w-full";

  return (
    <div
      className={`nm-media-frame border-edge bg-surface-sunken/60 relative overflow-hidden rounded-[var(--radius-control)] border ${frameWidthClass}`}
    >
      {kind === "image" ? (
        <EnlargeableImage
          src={url}
          alt="Image attached to note"
          className={`block max-w-full cursor-zoom-in ${fill ? "h-full w-full" : "w-fit"}`}
        >
          <BlossomImage
            src={url}
            alt="Image attached to note"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            referrerPolicy="no-referrer"
            className={framedClass}
          />
        </EnlargeableImage>
      ) : null}
      {kind === "video" ? <NoteVideo url={url} className={videoClass} /> : null}
      {kind === "audio" ? (
        <div className={fill ? "flex h-full items-center p-3" : "p-3"}>
          <audio src={url} controls preload="metadata" className="w-full" />
        </div>
      ) : null}
      {badge}
    </div>
  );
}
