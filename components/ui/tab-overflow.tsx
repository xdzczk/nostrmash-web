"use client";

import { useEffect, useRef, type ReactNode } from "react";

type OverflowEdge = "none" | "start" | "end" | "both";

function readOverflow(el: HTMLElement): OverflowEdge {
  const max = el.scrollWidth - el.clientWidth;
  if (max <= 1) return "none";
  const atStart = el.scrollLeft <= 1;
  const atEnd = el.scrollLeft >= max - 1;
  if (atStart) return "end";
  if (atEnd) return "start";
  return "both";
}

/**
 * Horizontal scroller that exposes which edges are clipped via
 * `data-overflow` (none|start|end|both) so CSS can fade the clipped side,
 * and scrolls the `aria-current="page"` child into view on mount.
 */
export function TabOverflow({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      el.dataset.overflow = readOverflow(el);
    };

    const active = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      // Move only this scroller. scrollIntoView also scrolls the page, and on a
      // sticky tab that jump lands above the activity section.
      const box = active.getBoundingClientRect();
      const host = el.getBoundingClientRect();
      if (box.left < host.left) el.scrollLeft -= host.left - box.left;
      else if (box.right > host.right) el.scrollLeft += box.right - host.right;
    }
    update();

    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    // The content can grow without the host changing size (web fonts
    // swapping in after first paint), so watch the scrolled child as well.
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} data-overflow="none" className={className}>
      {children}
    </div>
  );
}
