"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function CausalValue({ value, children }: { value: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useEffect(() => {
    const changed = previous.current !== value;
    previous.current = value;
    if (!changed || !ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    ref.current.animate(
      [
        { backgroundColor: "color-mix(in srgb, var(--accent-soft) 24%, transparent)" },
        { backgroundColor: "transparent" },
      ],
      { duration: 700, easing: "ease-out" }
    );
  }, [value]);

  return (
    <span ref={ref} className="rounded-sm">
      {children}
    </span>
  );
}
