"use client";

import { useEffect, useRef, useState } from "react";

/** Same-origin preview the media cards already use to paint a first frame. */
function frameSrc(url: string): string {
  const hashIndex = url.indexOf("#");
  const clean = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  return `/video-frame?src=${encodeURIComponent(clean)}`;
}

function captureStill(video: HTMLVideoElement): string | null {
  if (video.videoWidth < 1 || video.videoHeight < 1) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return null;
  }
}

/**
 * Fixed-frame thumbnail for a video that has no poster image.
 * The preview stays inside the caller's box; it is not a player.
 */
export function VideoStill({ url, className }: { url: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [still, setStill] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || still) return;
    // loadeddata is easy to miss when the preview finishes before this effect.
    const hold = () => {
      const captured = captureStill(video);
      if (captured) setStill(captured);
    };
    video.addEventListener("loadeddata", hold);
    const frame = requestAnimationFrame(hold);
    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener("loadeddata", hold);
    };
  }, [still, url]);

  if (still) {
    return (
      // The still is a same-origin canvas snapshot, not a remote file.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={still} alt="" className={className} />
    );
  }

  return (
    <video
      ref={videoRef}
      src={frameSrc(url)}
      muted
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      className={`pointer-events-none ${className ?? ""}`}
    />
  );
}
