"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { captureVideoStill, videoFrameSrc } from "@/components/explorer/video-frame";

/**
 * Decodes the one-frame preview of a video out of sight and hands back a copy
 * of the picture. It is a separate element from any player: Safari loads the
 * whole original file when an element that showed the preview is given the
 * real source, even with preload off.
 */
export function VideoFrameCapture({
  url,
  onStill,
  onFail,
}: {
  url: string;
  onStill: (still: string) => void;
  onFail: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const hold = () => {
      const captured = captureVideoStill(video);
      if (captured) onStill(captured);
    };
    video.addEventListener("loadeddata", hold);
    video.addEventListener("error", onFail);
    // The preview can settle before hydration, which leaves no event to hear.
    const frame = requestAnimationFrame(() => {
      if (video.error) onFail();
      else hold();
    });
    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener("loadeddata", hold);
      video.removeEventListener("error", onFail);
    };
  }, [url, onStill, onFail]);

  return (
    <video
      ref={videoRef}
      src={videoFrameSrc(url)}
      muted
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      className="pointer-events-none absolute top-0 left-0 h-px w-px opacity-0"
    />
  );
}

/** The first frame of a video as an image source, once it can be built. */
export function useVideoStill() {
  const [still, setStill] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  return { still, failed, setStill, fail };
}

/**
 * Fixed-frame thumbnail for a video that has no poster image. The caller's
 * box shows through until the frame is ready, and stays when none can be built.
 */
export function VideoStill({ url, className }: { url: string; className?: string }) {
  const { still, failed, setStill, fail } = useVideoStill();

  if (still) {
    return (
      // The still is a same-origin canvas snapshot, not a remote file.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={still} alt="" className={className} />
    );
  }
  if (failed) return null;
  return <VideoFrameCapture url={url} onStill={setStill} onFail={fail} />;
}
