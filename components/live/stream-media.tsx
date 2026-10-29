"use client";

import { useCallback, useEffect, useState } from "react";

import { BlossomImage } from "@/components/ui/blossom-image";
import { youtubeEmbedSrc } from "@/lib/notes/embeds";
import type { StreamSource } from "@/lib/notes/live-playback";

const PLAYBACK_ERROR = "This stream can't be played in the browser.";

async function startPlayback(media: HTMLMediaElement, onNeedGesture: () => void) {
  try {
    media.muted = false;
    await media.play();
  } catch {
    try {
      media.muted = true;
      await media.play();
      onNeedGesture();
    } catch {
      onNeedGesture();
    }
  }
}

function PlaybackError({ url }: { url: string }) {
  return (
    <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-2 bg-black/85 p-4 text-center">
      <p className="text-sm text-white">{PLAYBACK_ERROR}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-sm text-white underline"
      >
        Open stream
      </a>
    </div>
  );
}

function YouTubeMedia({ videoId, title }: { videoId: string; title: string }) {
  const src = `${youtubeEmbedSrc(videoId)}&autoplay=1&playsinline=1`;
  return (
    <iframe
      src={src}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="h-full w-full bg-black"
    />
  );
}

/**
 * One media element for the life of a URL. Callers must not remount this
 * when the player moves between the card and the dock.
 */
function PlayableMedia({
  source,
  poster,
  controls,
  onMedia,
}: {
  source: Extract<StreamSource, { kind: "hls" | "file" }>;
  poster?: string;
  controls: boolean;
  onMedia: (element: HTMLMediaElement | null) => void;
}) {
  const audio = source.kind === "file" && source.media === "audio";
  const [mediaElement, setMediaElement] = useState<HTMLMediaElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [ready, setReady] = useState(false);
  const [audioOnly, setAudioOnly] = useState(audio);
  const sourceUrl = source.url;
  const sourceKind = source.kind;
  const setAudioElement = useCallback((node: HTMLAudioElement | null) => {
    setMediaElement(node);
  }, []);
  const setVideoElement = useCallback((node: HTMLVideoElement | null) => {
    setMediaElement(node);
  }, []);

  useEffect(() => {
    onMedia(mediaElement);
    return () => onMedia(null);
  }, [mediaElement, onMedia]);

  useEffect(() => {
    if (!mediaElement) return;
    let cancelled = false;
    let detach: (() => void) | undefined;
    let started = false;

    const playOnce = () => {
      if (started || cancelled) return;
      started = true;
      void startPlayback(mediaElement, () => {
        if (!cancelled) setNeedsUnmute(true);
      });
    };
    const markReady = () => {
      if (!cancelled) setReady(true);
    };
    mediaElement.addEventListener("playing", markReady);

    const attachNative = () => {
      mediaElement.src = sourceUrl;
      mediaElement.addEventListener("loadedmetadata", playOnce);
      detach = () => {
        mediaElement.removeEventListener("loadedmetadata", playOnce);
        mediaElement.removeAttribute("src");
        mediaElement.load();
      };
    };

    const attach = async () => {
      if (sourceKind === "file") {
        attachNative();
        return;
      }
      // Chromium answers canPlayType("application/vnd.apple.mpegurl") with
      // "maybe" and then never loads the playlist. Use hls.js wherever MSE
      // works, and leave native HLS to browsers where it does not (Safari).
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (!Hls.isSupported()) {
        if (
          mediaElement instanceof HTMLVideoElement &&
          mediaElement.canPlayType("application/vnd.apple.mpegurl") !== ""
        ) {
          attachNative();
          return;
        }
        setError(PLAYBACK_ERROR);
        return;
      }
      const hls = new Hls({
        enableWorker: false,
        capLevelToPlayerSize: true,
        backBufferLength: 30,
        liveDurationInfinity: true,
      });
      let recoveries = 0;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        recoveries += 1;
        if (recoveries > 2) {
          setError(PLAYBACK_ERROR);
          hls.destroy();
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else {
          setError(PLAYBACK_ERROR);
          hls.destroy();
        }
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => playOnce());
      hls.loadSource(sourceUrl);
      hls.attachMedia(mediaElement);
      detach = () => hls.destroy();
    };

    void attach();
    return () => {
      cancelled = true;
      mediaElement.removeEventListener("playing", markReady);
      detach?.();
    };
  }, [mediaElement, sourceKind, sourceUrl]);

  const unmute = () => {
    if (!mediaElement) return;
    mediaElement.muted = false;
    setNeedsUnmute(false);
    void mediaElement.play().catch(() => setNeedsUnmute(true));
  };

  return (
    <div className="relative h-full w-full">
      {audioOnly && poster ? (
        <BlossomImage
          src={poster}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {audio ? (
        <audio
          ref={setAudioElement}
          controls={controls}
          preload="none"
          className="absolute inset-x-0 bottom-0 z-[1] w-full"
        />
      ) : (
        <video
          ref={setVideoElement}
          controls={controls}
          playsInline
          poster={audioOnly ? undefined : poster}
          preload="none"
          className={
            audioOnly
              ? "absolute inset-x-0 bottom-0 z-[1] w-full bg-transparent"
              : "h-full w-full bg-black object-contain"
          }
          onLoadedMetadata={(event) => {
            if (event.currentTarget.videoWidth === 0) setAudioOnly(true);
          }}
        />
      )}
      {!ready && !error && !needsUnmute ? (
        <p className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-sm text-white">
          Connecting…
        </p>
      ) : null}
      {needsUnmute ? (
        <button
          type="button"
          onClick={unmute}
          className="absolute bottom-3 left-3 z-[2] rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-black"
        >
          Unmute
        </button>
      ) : null}
      {error ? <PlaybackError url={sourceUrl} /> : null}
    </div>
  );
}

export function StreamMedia({
  source,
  poster,
  title,
  controls,
  onMedia,
}: {
  source: StreamSource;
  poster?: string;
  title: string;
  controls: boolean;
  onMedia: (element: HTMLMediaElement | null) => void;
}) {
  let media = <PlaybackError url={source.url} />;
  if (source.kind === "youtube") media = <YouTubeMedia videoId={source.videoId} title={title} />;
  if (source.kind === "hls" || source.kind === "file") {
    media = <PlayableMedia source={source} poster={poster} controls={controls} onMedia={onMedia} />;
  }
  return <div className="relative h-full w-full">{media}</div>;
}
