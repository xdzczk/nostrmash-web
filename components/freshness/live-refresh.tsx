"use client";

import { useEffect, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Refresh RSC payload while the tab is visible (matches ~60s server TTL). */
export function LiveRefresh({ intervalMs = 75_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        startTransition(() => router.refresh());
      }
    };

    const timer = window.setInterval(tick, intervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs, router, startTransition]);

  if (!online) {
    return (
      <div
        role="status"
        className="border-edge/70 bg-surface/55 text-ink-muted rounded-xl border-l-2 border-l-[var(--accent-soft)] px-4 py-3 text-sm"
      >
        You&apos;re offline. Showing the last available Discover ranking.
      </div>
    );
  }

  return isPending ? (
    <div
      role="status"
      className="border-edge/80 bg-surface/95 text-ink-muted fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs shadow-lg backdrop-blur-lg sm:right-6 sm:bottom-6"
    >
      <span className="nm-live-dot" aria-hidden />
      Updating changed ranking signals…
    </div>
  ) : null;
}
