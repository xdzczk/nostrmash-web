"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

function subscribeNoop() {
  return () => {};
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

/** Scale a picture so it fills the stage on its longer side, including upscaling. */
export function fittedMediaSize(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } | null {
  if (
    !(naturalWidth > 0) ||
    !(naturalHeight > 0) ||
    !(maxWidth > 0) ||
    !(maxHeight > 0) ||
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(naturalHeight) ||
    !Number.isFinite(maxWidth) ||
    !Number.isFinite(maxHeight)
  ) {
    return null;
  }

  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  return {
    width: Math.max(1, Math.floor(naturalWidth * scale)),
    height: Math.max(1, Math.floor(naturalHeight * scale)),
  };
}

export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const isClient = useIsClient();
  const title = alt.trim() || "Enlarged image";
  const [fitted, setFitted] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const img = imgRef.current;
      if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
      const bounds = frame.getBoundingClientRect();
      const next = fittedMediaSize(
        img.naturalWidth,
        img.naturalHeight,
        bounds.width,
        bounds.height
      );
      setFitted((current) =>
        current && next && current.width === next.width && current.height === next.height
          ? current
          : next
      );
    };

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(frame);
    // A cached file can finish loading before React attaches onLoad.
    const img = imgRef.current;
    const frameId =
      img?.complete && img.naturalWidth > 0 ? window.requestAnimationFrame(measure) : null;
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [open, src]);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open || !isClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120]" role="presentation">
      <button
        type="button"
        aria-label="Dismiss enlarged image"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="nm-pressable focus-visible:ring-accent-soft/70 absolute top-4 right-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      <div
        ref={frameRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pointer-events-none absolute inset-3 sm:inset-8"
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onLoad={() => {
            const frame = frameRef.current;
            const img = imgRef.current;
            if (!frame || !img) return;
            const bounds = frame.getBoundingClientRect();
            setFitted(
              fittedMediaSize(img.naturalWidth, img.naturalHeight, bounds.width, bounds.height)
            );
          }}
          onError={() => setFailed(true)}
          style={
            fitted
              ? {
                  width: fitted.width,
                  height: fitted.height,
                  maxWidth: "none",
                  maxHeight: "none",
                }
              : undefined
          }
          className={`absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 rounded-lg ${
            fitted || failed ? "pointer-events-auto" : "pointer-events-none opacity-0"
          }`}
        />
      </div>
    </div>,
    document.body
  );
}

export function EnlargeableImage({
  src,
  alt,
  children,
  className = "",
  label,
}: {
  src: string;
  alt: string;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label ?? (alt.trim() ? `Enlarge ${alt}` : "Enlarge image")}
        className={`border-0 bg-transparent p-0 ${className}`.trim()}
      >
        {children}
      </button>
      <ImageLightbox key={src} src={src} alt={alt} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
