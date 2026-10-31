"use client";

import Link from "next/link";

import { serializeDiscoveryWindowPreferenceCookie } from "@/lib/discover/discovery-window-session";
import {
  DEFAULT_STATS_WINDOW,
  STATS_WINDOWS,
  formatStatsWindowLabel,
  isStatsWindow,
} from "@/lib/search-params/window";

export function WindowSelector({
  path,
  searchParams,
  activeWindow,
  windows = STATS_WINDOWS,
  defaultWindow = DEFAULT_STATS_WINDOW,
  labels,
  ariaLabel = "Ranking window",
  /**
   * These routes read cookies, so Next only prefetches the loading skeleton
   * unless a link asks for the full payload. The other ranges then paint from
   * the client cache instead of waiting on a fresh server render.
   */
  prefetch = true,
  /**
   * Write the choice before navigation. Discover uses this so 24h clears the
   * saved range before the URL that omits `window` is requested. Search and
   * relay ranges stay local to those pages.
   */
  persist = false,
}: {
  path: string;
  searchParams: URLSearchParams;
  activeWindow: string;
  windows?: readonly string[];
  defaultWindow?: string;
  labels?: Record<string, string>;
  ariaLabel?: string;
  prefetch?: boolean;
  persist?: boolean;
}) {
  return (
    <div
      className="border-edge-strong bg-surface/40 inline-flex items-center rounded-full border p-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      {windows.map((window) => {
        const isActive = window === activeWindow;
        return (
          <Link
            key={window}
            href={windowChoiceHref(path, searchParams, window, defaultWindow)}
            prefetch={persist && window === defaultWindow ? false : prefetch}
            onClick={() => {
              if (!persist || !isStatsWindow(window)) return;
              document.cookie = serializeDiscoveryWindowPreferenceCookie(window);
            }}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              isActive ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {labels?.[window] ??
              (isStatsWindow(window) ? formatStatsWindowLabel(window, "short") : window)}
          </Link>
        );
      })}
    </div>
  );
}

function windowChoiceHref(
  path: string,
  current: URLSearchParams,
  window: string,
  defaultWindow: string
): string {
  const next = new URLSearchParams(current);
  if (window === defaultWindow) next.delete("window");
  else next.set("window", window);
  next.delete("cursor");
  next.delete("health_cursor");
  next.delete("offset");
  const query = next.toString();
  return query.length > 0 ? `${path}?${query}` : path;
}
