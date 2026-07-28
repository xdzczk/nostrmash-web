"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh RSC payload while the tab is visible (matches ~60s server TTL). */
export function LiveRefresh({ intervalMs = 75_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const timer = window.setInterval(tick, intervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs, router]);

  return null;
}
