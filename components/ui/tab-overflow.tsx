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
      const box = active.getBoundingClientRect();
      const host = el.getBoundingClientRect();
      if (box.left < host.left || box.right > host.right) {
        active.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
      }
    }
    update();

    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
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
