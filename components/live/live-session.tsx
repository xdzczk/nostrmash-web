"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { StreamMedia } from "@/components/live/stream-media";
import { BlossomImage } from "@/components/ui/blossom-image";
import { Button } from "@/components/ui/button";
import { classifyStreamUrl, type LiveSession } from "@/lib/notes/live-playback";

type Placement = "inline" | "stage" | "mini";

type LiveSessionApi = {
  session: LiveSession | null;
  placement: Placement;
  hasMedia: boolean;
  playing: boolean;
  muted: boolean;
  canPip: boolean;
  pipSupported: boolean;
  watch: (session: LiveSession) => void;
  minimize: () => void;
  expand: () => void;
  close: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  togglePip: () => void;
  registerSlot: (
    key: string,
    node: HTMLDivElement | null,
    released?: HTMLDivElement | null
  ) => void;
};

const LiveSessionContext = createContext<LiveSessionApi | null>(null);

function useLiveSession(): LiveSessionApi {
  const value = useContext(LiveSessionContext);
  if (!value) throw new Error("LiveSessionProvider is missing");
  return value;
}

/**
 * The playing element lives here, in the root layout, so leaving a page does
 * not unmount it. Inline playback moves that same DOM node into the card.
 * Navigating away docks it and keeps the stream running.
 */
export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [placement, setPlacement] = useState<Placement>("mini");
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);
  const [hasMedia, setHasMedia] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [canPip, setCanPip] = useState(false);

  const sessionRef = useRef<LiveSession | null>(null);
  const placementRef = useRef<Placement>("mini");
  const portalRef = useRef<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const listenerCleanup = useRef<(() => void) | null>(null);
  const slotNodes = useRef(new Map<string, HTMLDivElement>());
  const detachGeneration = useRef(0);
  const resumeAfterMove = useRef(false);
  const movedAt = useRef(0);

  const source = useMemo(() => (session ? classifyStreamUrl(session.streaming) : null), [session]);

  const resumeMovedPlayback = useCallback(() => {
    if (!resumeAfterMove.current) return;
    const media = mediaRef.current;
    if (!media || media.ended) {
      resumeAfterMove.current = false;
      return;
    }
    // Still playing: the pause from the move can land a moment later.
    if (!media.paused) return;
    // The dock stays hidden until the card slot lets go. play() is rejected
    // there, and a retry has to wait until the element is actually on screen.
    if (!media.isConnected || media.getClientRects().length === 0) return;

    const attempt = media;
    const finish = () => {
      if (!attempt.paused) resumeAfterMove.current = false;
    };
    void attempt.play().then(finish, () => {
      if (!resumeAfterMove.current || mediaRef.current !== attempt) return;
      attempt.muted = true;
      void attempt.play().then(finish, () => undefined);
    });
  }, []);

  const relocatePortal = useCallback(
    (parent: HTMLElement) => {
      const portal = portalRef.current;
      if (!portal || portal.parentElement === parent) return;
      const media = mediaRef.current;
      if (media && !media.paused && !media.ended) {
        resumeAfterMove.current = true;
        movedAt.current = performance.now();
        const onPause = () => {
          media.removeEventListener("pause", onPause);
          resumeMovedPlayback();
        };
        media.addEventListener("pause", onPause);
        window.setTimeout(() => media.removeEventListener("pause", onPause), 1000);
      }
      parent.appendChild(portal);
      resumeMovedPlayback();
    },
    [resumeMovedPlayback]
  );

  const ensurePortal = useCallback(() => {
    if (!portalRef.current) {
      const element = document.createElement("div");
      element.className = "h-full w-full";
      portalRef.current = element;
    }
    const dock = dockRef.current;
    if (dock && !portalRef.current.parentElement) dock.appendChild(portalRef.current);
    setPortalNode(portalRef.current);
    return portalRef.current;
  }, []);

  const registerSlot = useCallback(
    (key: string, node: HTMLDivElement | null, released?: HTMLDivElement | null) => {
      const slots = slotNodes.current;
      if (node) slots.set(key, node);
      else if (released && slots.get(key) === released) slots.delete(key);

      const portal = portalRef.current;
      const dock = dockRef.current;
      if (!portal || !dock) return;

      if (node) {
        detachGeneration.current += 1;
        if (
          sessionRef.current?.key === key &&
          placementRef.current === "inline" &&
          portal.parentElement !== node
        ) {
          relocatePortal(node);
        }
        return;
      }

      if (released && portal.parentElement === released) relocatePortal(dock);
      if (slots.has(key)) return;
      if (sessionRef.current?.key !== key || placementRef.current !== "inline") return;

      const generation = detachGeneration.current + 1;
      detachGeneration.current = generation;
      queueMicrotask(() => {
        if (detachGeneration.current !== generation) return;
        if (slotNodes.current.has(key)) return;
        if (sessionRef.current?.key !== key || placementRef.current !== "inline") return;
        placementRef.current = "mini";
        setPlacement("mini");
      });
    },
    [relocatePortal]
  );

  const bindMedia = useCallback((element: HTMLMediaElement | null) => {
    listenerCleanup.current?.();
    listenerCleanup.current = null;
    mediaRef.current = element;
    if (!element) {
      setHasMedia(false);
      setCanPip(false);
      setPlaying(false);
      return;
    }
    setHasMedia(true);
    setCanPip(element instanceof HTMLVideoElement);
    const sync = () => {
      setPlaying(!element.paused);
      setMuted(element.muted);
    };
    const onPause = () => {
      sync();
      // A pause long after the move is the viewer's, so don't start it again.
      if (performance.now() - movedAt.current > 1000) resumeAfterMove.current = false;
    };
    element.addEventListener("play", sync);
    element.addEventListener("pause", onPause);
    element.addEventListener("volumechange", sync);
    sync();
    listenerCleanup.current = () => {
      element.removeEventListener("play", sync);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("volumechange", sync);
    };
  }, []);

  const watch = useCallback(
    (next: LiveSession) => {
      ensurePortal();
      const current = sessionRef.current;
      sessionRef.current = next;
      placementRef.current = "inline";
      setPlacement("inline");
      if (!current || current.key !== next.key || current.streaming !== next.streaming) {
        setSession(next);
      }
    },
    [ensurePortal]
  );

  const minimize = useCallback(() => {
    placementRef.current = "mini";
    setPlacement("mini");
    requestAnimationFrame(() => shellRef.current?.focus());
  }, []);

  const expand = useCallback(() => {
    placementRef.current = "stage";
    setPlacement("stage");
  }, []);

  const close = useCallback(() => {
    resumeAfterMove.current = false;
    mediaRef.current?.pause();
    sessionRef.current = null;
    placementRef.current = "mini";
    setSession(null);
    setPlacement("mini");
  }, []);

  const togglePlay = useCallback(() => {
    const element = mediaRef.current;
    if (!element) return;
    resumeAfterMove.current = false;
    if (element.paused) void element.play().catch(() => undefined);
    else element.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const element = mediaRef.current;
    if (!element) return;
    element.muted = !element.muted;
  }, []);

  const togglePip = useCallback(() => {
    const element = mediaRef.current;
    if (!(element instanceof HTMLVideoElement)) return;
    if (!document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement === element) {
      void document.exitPictureInPicture().catch(() => undefined);
      return;
    }
    void element.requestPictureInPicture().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session || placement !== "inline") return;
    const portal = portalRef.current;
    const dock = dockRef.current;
    if (!portal || !dock) return;
    const slot = slotNodes.current.get(session.key);
    if (slot) {
      relocatePortal(slot);
      return;
    }
    // The card slot registers in the same commit. If it never appears, dock
    // the stream instead of leaving it on a hidden inline target.
    const timer = window.setTimeout(() => {
      if (slotNodes.current.has(session.key)) return;
      if (placementRef.current !== "inline" || sessionRef.current?.key !== session.key) return;
      relocatePortal(dock);
      placementRef.current = "stage";
      setPlacement("stage");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [placement, portalNode, relocatePortal, session]);

  useEffect(() => {
    resumeMovedPlayback();
  }, [placement, resumeMovedPlayback]);

  const embed = pathname.startsWith("/embed");
  const dockVisible = Boolean(session) && placement !== "inline" && !embed;
  const pipSupported =
    dockVisible &&
    typeof document !== "undefined" &&
    "pictureInPictureEnabled" in document &&
    document.pictureInPictureEnabled === true;

  useEffect(() => {
    const shell = shellRef.current;
    if (!dockVisible || !shell) {
      document.body.style.removeProperty("padding-bottom");
      return;
    }
    const apply = () => {
      const miniFloat =
        placementRef.current === "mini" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(min-width: 640px)").matches;
      if (miniFloat) {
        document.body.style.removeProperty("padding-bottom");
        return;
      }
      const height = shell.getBoundingClientRect().height;
      if (height > 0) document.body.style.paddingBottom = `${Math.ceil(height)}px`;
    };
    apply();
    if (typeof ResizeObserver === "undefined") {
      return () => document.body.style.removeProperty("padding-bottom");
    }
    const observer = new ResizeObserver(apply);
    observer.observe(shell);
    const mediaQuery =
      typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 640px)") : null;
    mediaQuery?.addEventListener("change", apply);
    return () => {
      observer.disconnect();
      mediaQuery?.removeEventListener("change", apply);
      document.body.style.removeProperty("padding-bottom");
    };
  }, [dockVisible, placement]);

  const api = useMemo<LiveSessionApi>(
    () => ({
      session,
      placement,
      hasMedia,
      playing,
      muted,
      canPip,
      pipSupported,
      watch,
      minimize,
      expand,
      close,
      togglePlay,
      toggleMute,
      togglePip,
      registerSlot,
    }),
    [
      canPip,
      close,
      expand,
      hasMedia,
      minimize,
      muted,
      pipSupported,
      placement,
      playing,
      registerSlot,
      session,
      toggleMute,
      togglePip,
      togglePlay,
      watch,
    ]
  );

  const setDockNode = useCallback((node: HTMLDivElement | null) => {
    dockRef.current = node;
  }, []);

  return (
    <LiveSessionContext.Provider value={api}>
      {children}
      <div
        ref={shellRef}
        hidden={!dockVisible}
        tabIndex={dockVisible ? -1 : undefined}
        role={dockVisible ? "region" : undefined}
        aria-label={dockVisible && session ? `Playing ${session.title}` : undefined}
        className={
          dockVisible
            ? placement === "mini"
              ? "nm-elevated-surface border-edge fixed inset-x-0 bottom-0 z-40 border-t pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.28)] focus:outline-none sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-80 sm:overflow-hidden sm:rounded-[var(--radius-surface)] sm:border sm:pb-0"
              : "nm-elevated-surface border-edge fixed inset-x-0 bottom-0 z-40 border-t pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.35)] focus:outline-none"
            : "hidden"
        }
      >
        <div
          className={
            placement === "stage"
              ? "mx-auto flex w-full max-w-3xl flex-col"
              : "flex items-center gap-2 p-2 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0"
          }
        >
          <div
            ref={setDockNode}
            className={
              placement === "mini"
                ? "h-16 w-28 shrink-0 overflow-hidden rounded-md bg-black sm:aspect-video sm:h-auto sm:w-full sm:rounded-none"
                : "h-[min(42vh,24rem)] w-full overflow-hidden bg-black"
            }
          />
          {dockVisible && session ? (
            <DockChrome
              session={session}
              placement={placement}
              hasMedia={hasMedia}
              playing={playing}
              muted={muted}
              showPip={placement === "mini" && pipSupported && canPip}
              onTogglePlay={togglePlay}
              onToggleMute={toggleMute}
              onTogglePip={togglePip}
              onExpand={expand}
              onMinimize={minimize}
              onClose={close}
            />
          ) : null}
        </div>
      </div>
      {portalNode && session && source
        ? createPortal(
            <StreamMedia
              key={session.streaming}
              source={source}
              poster={session.image}
              title={session.title}
              controls={placement !== "mini"}
              onMedia={bindMedia}
            />,
            portalNode
          )
        : null}
    </LiveSessionContext.Provider>
  );
}

function DockChrome({
  session,
  placement,
  hasMedia,
  playing,
  muted,
  showPip,
  onTogglePlay,
  onToggleMute,
  onTogglePip,
  onExpand,
  onMinimize,
  onClose,
}: {
  session: LiveSession;
  placement: Placement;
  hasMedia: boolean;
  playing: boolean;
  muted: boolean;
  showPip: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onTogglePip: () => void;
  onExpand: () => void;
  onMinimize: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 px-1 sm:px-3 sm:py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="nm-live-dot" aria-hidden />
        <div className="min-w-0">
          {session.href ? (
            <Link
              href={session.href}
              className="text-ink hover:text-ink-strong block truncate text-sm font-medium"
            >
              {session.title}
            </Link>
          ) : (
            <p className="text-ink truncate text-sm font-medium">{session.title}</p>
          )}
          {session.authorLabel ? (
            <p className="text-ink-muted truncate text-xs">{session.authorLabel}</p>
          ) : null}
        </div>
      </div>
      {hasMedia ? (
        <PlayerButton label={playing ? "Pause" : "Play"} onClick={onTogglePlay}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </PlayerButton>
      ) : null}
      {hasMedia ? (
        <PlayerButton label={muted ? "Unmute" : "Mute"} onClick={onToggleMute}>
          {muted ? <MutedIcon /> : <VolumeIcon />}
        </PlayerButton>
      ) : null}
      {showPip ? (
        <PlayerButton label="Picture in picture" onClick={onTogglePip}>
          <PipIcon />
        </PlayerButton>
      ) : null}
      {placement === "mini" ? (
        <PlayerButton label="Expand player" onClick={onExpand}>
          <ExpandIcon />
        </PlayerButton>
      ) : (
        <PlayerButton label="Play in background" onClick={onMinimize}>
          <MinimizeIcon />
        </PlayerButton>
      )}
      <PlayerButton label="Stop stream" onClick={onClose}>
        <CloseIcon />
      </PlayerButton>
    </div>
  );
}

export function LivePlaybackFrame({
  sessionKey,
  title,
  image,
  priority = false,
}: {
  sessionKey: string;
  title: string;
  image?: string;
  priority?: boolean;
}) {
  const { session, placement, registerSlot, minimize, close } = useLiveSession();
  const inline = session?.key === sessionKey && placement === "inline";
  const ownedSlot = useRef<HTMLDivElement | null>(null);
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        ownedSlot.current = node;
        registerSlot(sessionKey, node);
        return;
      }
      const released = ownedSlot.current;
      ownedSlot.current = null;
      registerSlot(sessionKey, null, released);
    },
    [registerSlot, sessionKey]
  );

  if (inline) {
    return (
      <div className="relative z-[2] mt-3 max-w-3xl">
        <div
          ref={ref}
          role="group"
          aria-label={`${title} player`}
          className="border-edge aspect-video overflow-hidden rounded-[var(--radius-control)] border bg-black"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={minimize}>
            Play in background
          </Button>
          <Button size="sm" variant="ghost" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (!image) return null;
  return (
    <div className="border-edge bg-surface-sunken/60 mt-3 max-w-3xl overflow-hidden rounded-[var(--radius-control)] border">
      <BlossomImage
        src={image}
        alt=""
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        className="max-h-80 w-full object-cover"
      />
    </div>
  );
}

export function LiveWatchButton({ session }: { session: LiveSession }) {
  const { session: active, placement, watch } = useLiveSession();
  const playable = classifyStreamUrl(session.streaming).kind !== "external";
  const current = active?.key === session.key;
  const watchingHere = current && placement === "inline";

  return (
    <div className="relative z-[2] mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      {playable ? (
        <Button
          size="sm"
          variant={watchingHere ? "secondary" : "primary"}
          aria-pressed={current}
          onClick={() => watch(session)}
        >
          {watchingHere ? "Watching" : current ? "Show here" : "Watch"}
        </Button>
      ) : (
        <a
          href={session.streaming}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-link hover:text-link-hover text-xs"
        >
          Stream
        </a>
      )}
      {playable ? (
        <a
          href={session.streaming}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-link hover:text-link-hover text-xs"
        >
          Open stream
        </a>
      ) : null}
    </div>
  );
}

function PlayerButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="nm-pressable text-ink-muted hover:bg-surface-hover hover:text-ink focus-visible:ring-accent-soft/70 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function PlayIcon() {
  return (
    <Icon>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

function PauseIcon() {
  return (
    <Icon>
      <path d="M8 5v14M16 5v14" />
    </Icon>
  );
}

function VolumeIcon() {
  return (
    <Icon>
      <path d="M4 10h3l4-3v10l-4-3H4v-4Z" />
      <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
    </Icon>
  );
}

function MutedIcon() {
  return (
    <Icon>
      <path d="M4 10h3l4-3v10l-4-3H4v-4Z" />
      <path d="M16 10l4 4M20 10l-4 4" />
    </Icon>
  );
}

function ExpandIcon() {
  return (
    <Icon>
      <path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4" />
    </Icon>
  );
}

function MinimizeIcon() {
  return (
    <Icon>
      <path d="M5 9V5h4M19 9V5h-4M5 15v4h4M19 15v4h-4" />
    </Icon>
  );
}

function PipIcon() {
  return (
    <Icon>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <rect x="12" y="11" width="7" height="6" rx="0.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

function CloseIcon() {
  return (
    <Icon>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}
