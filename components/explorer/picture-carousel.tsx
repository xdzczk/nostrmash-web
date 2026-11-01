"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { NoteMediaReveal } from "@/components/explorer/note-media-reveal";
import type { MediaImage } from "@/lib/notes/media-event";

type PictureFrame = "full" | "detail";

const CONTROL_CLASS =
  "nm-pressable border-edge bg-surface/90 text-ink focus-visible:ring-accent-soft/70 absolute top-1/2 z-[3] inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-sm focus-visible:ring-2 focus-visible:outline-none";

function closestSlide(scroller: HTMLElement): number {
  const left = scroller.scrollLeft;
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < scroller.children.length; index += 1) {
    const child = scroller.children.item(index);
    if (!(child instanceof HTMLElement)) continue;
    const distance = Math.abs(child.offsetLeft - left);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

/** Place the arrows on the current photo, which is centered in a full-width slide. */
function frameEdge(scroller: HTMLElement, index: number): { left: number; right: number } | null {
  const slide = scroller.children.item(index);
  const frame =
    slide instanceof HTMLElement ? slide.querySelector<HTMLElement>("[data-picture-frame]") : null;
  if (!(slide instanceof HTMLElement) || !frame) return null;
  const slideBox = slide.getBoundingClientRect();
  const frameBox = frame.getBoundingClientRect();
  if (slideBox.width <= 0 || frameBox.width <= 0) return null;
  return {
    left: Math.max(8, frameBox.left - slideBox.left + 8),
    right: Math.max(8, slideBox.right - frameBox.right + 8),
  };
}

function scrollBehavior(): ScrollBehavior {
  if (typeof window.matchMedia !== "function") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <path d="M14.5 6.5 9 12l5.5 5.5" />
      ) : (
        <path d="M9.5 6.5 15 12l-5.5 5.5" />
      )}
    </svg>
  );
}

/**
 * One frame at a time for a picture set. Each photo keeps its own aspect ratio.
 * Swipe, the arrows, or the arrow keys move between frames.
 */
export function PictureCarousel({
  images,
  variant = "full",
  priority = false,
  fallbackAlt = "Picture",
  label = "Pictures",
  className = "",
}: {
  images: readonly MediaImage[];
  variant?: PictureFrame;
  priority?: boolean;
  fallbackAlt?: string;
  label?: string;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const suppressScrollCommit = useRef(false);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [index, setIndex] = useState(0);
  const [edge, setEdge] = useState<{ left: number; right: number } | null>(null);
  const scrollerId = useId();
  const count = images.length;
  const activeIndex = count === 0 ? 0 : Math.min(index, count - 1);

  useEffect(() => {
    indexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const update = () => {
      const next = frameEdge(scroller, indexRef.current);
      if (!next) return;
      setEdge((current) =>
        current &&
        Math.abs(current.left - next.left) < 1 &&
        Math.abs(current.right - next.right) < 1
          ? current
          : next
      );
    };

    update();
    const frameId = window.requestAnimationFrame(update);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(scroller);
    const slide = scroller.children.item(indexRef.current);
    const frame =
      slide instanceof HTMLElement
        ? slide.querySelector<HTMLElement>("[data-picture-frame]")
        : null;
    if (frame) observer?.observe(frame);
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [activeIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const commit = () => {
      if (suppressScrollCommit.current || scroller.clientWidth <= 0) return;
      const next = closestSlide(scroller);
      setIndex((current) => (current === next ? current : next));
    };

    let timer = 0;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        suppressScrollCommit.current = false;
        commit();
      }, 150);
    };
    const onScrollEnd = () => {
      window.clearTimeout(timer);
      suppressScrollCommit.current = false;
      commit();
    };
    const onResize = () => {
      const slide = scroller.children.item(indexRef.current);
      if (!(slide instanceof HTMLElement) || scroller.clientWidth <= 0) return;
      if (Math.abs(scroller.scrollLeft - slide.offsetLeft) < 2) return;
      scroller.scrollTo({ left: slide.offsetLeft });
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  if (count < 2) return null;

  const go = (next: number) => {
    const scroller = scrollerRef.current;
    const clamped = Math.max(0, Math.min(count - 1, next));
    setIndex(clamped);
    const slide = scroller?.children.item(clamped);
    if (!scroller || !(slide instanceof HTMLElement) || scroller.clientWidth <= 0) {
      suppressScrollCommit.current = false;
      return;
    }
    if (Math.abs(scroller.scrollLeft - slide.offsetLeft) < 2) {
      suppressScrollCommit.current = false;
      return;
    }
    suppressScrollCommit.current = true;
    scroller.scrollTo({ left: slide.offsetLeft, behavior: scrollBehavior() });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      go(0);
    } else if (event.key === "End") {
      event.preventDefault();
      go(count - 1);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.moved) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 10) drag.moved = true;
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (!drag?.moved) {
      dragRef.current = null;
      return;
    }
    window.setTimeout(() => {
      if (dragRef.current === drag) dragRef.current = null;
    }, 400);
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current?.moved) return;
    dragRef.current = null;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className={`relative z-[2] ${className}`.trim()}>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="relative"
      >
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {`Picture ${activeIndex + 1} of ${count}`}
        </p>
        <div
          ref={scrollerRef}
          id={scrollerId}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
          className="flex snap-x snap-mandatory [scrollbar-width:none] items-center overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, slideIndex) => {
            const current = slideIndex === activeIndex;
            const alt = image.alt?.trim() || fallbackAlt;
            return (
              <div
                key={image.url}
                role="group"
                aria-roledescription="slide"
                aria-label={`${slideIndex + 1} of ${count}`}
                aria-hidden={current ? undefined : true}
                className="relative flex w-0 min-w-full shrink-0 snap-start snap-always justify-center"
              >
                <div data-picture-frame="" className="relative w-fit max-w-full">
                  <NoteMediaReveal
                    url={image.url}
                    kind="image"
                    variant={variant}
                    priority={priority && slideIndex === 0}
                    alt={alt}
                    inert={!current}
                  />
                  <span
                    aria-hidden
                    className="bg-surface/90 text-ink border-edge pointer-events-none absolute bottom-2 left-1/2 z-[3] -translate-x-1/2 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums backdrop-blur-sm"
                  >
                    {slideIndex + 1} / {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <CarouselControl
          label="Previous picture"
          controls={scrollerId}
          unavailable={activeIndex === 0}
          className={edge ? "" : "left-2"}
          style={edge ? { left: edge.left } : undefined}
          onClick={() => go(activeIndex - 1)}
        >
          <Chevron direction="left" />
        </CarouselControl>
        <CarouselControl
          label="Next picture"
          controls={scrollerId}
          unavailable={activeIndex === count - 1}
          className={edge ? "" : "right-2"}
          style={edge ? { right: edge.right } : undefined}
          onClick={() => go(activeIndex + 1)}
        >
          <Chevron direction="right" />
        </CarouselControl>
      </div>
    </div>
  );
}

function CarouselControl({
  label,
  controls,
  unavailable,
  className,
  style,
  onClick,
  children,
}: {
  label: string;
  controls: string;
  unavailable: boolean;
  className: string;
  style?: CSSProperties;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-overlay-control=""
      aria-label={label}
      aria-controls={controls}
      aria-disabled={unavailable || undefined}
      style={style}
      onClick={() => {
        if (unavailable) return;
        onClick();
      }}
      className={[CONTROL_CLASS, className, unavailable ? "opacity-35" : "hover:bg-surface"].join(
        " "
      )}
    >
      {children}
    </button>
  );
}
