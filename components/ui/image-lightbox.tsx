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
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const isClient = useIsClient();
  const title = alt.trim() || "Enlarged image";

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
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pointer-events-none relative flex h-full items-center justify-center p-4 sm:p-8"
      >
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className="pointer-events-auto max-h-[min(90vh,56rem)] max-w-[min(96vw,72rem)] rounded-lg object-contain"
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
      <ImageLightbox src={src} alt={alt} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
