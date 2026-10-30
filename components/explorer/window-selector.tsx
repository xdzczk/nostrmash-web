import Link from "next/link";

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
  labelFor,
  ariaLabel = "Ranking window",
  /**
   * These routes read cookies, so Next only prefetches the loading skeleton
   * unless a link asks for the full payload. The other ranges then paint from
   * the client cache instead of waiting on a fresh server render.
   */
  prefetch = true,
}: {
  path: string;
  searchParams: URLSearchParams;
  activeWindow: string;
  windows?: readonly string[];
  defaultWindow?: string;
  labelFor?: (window: string) => string;
  ariaLabel?: string;
  prefetch?: boolean;
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
            prefetch={prefetch}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              isActive ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {labelFor
              ? labelFor(window)
              : isStatsWindow(window)
                ? formatStatsWindowLabel(window, "short")
                : window}
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
