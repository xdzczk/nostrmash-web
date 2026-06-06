import Link from "next/link";

import {
  STATS_WINDOWS,
  buildWindowHref,
  formatStatsWindowLabel,
  type StatsWindow,
} from "@/lib/search-params/window";

export function WindowSelector({
  path,
  searchParams,
  activeWindow,
}: {
  path: string;
  searchParams: URLSearchParams;
  activeWindow: StatsWindow;
}) {
  return (
    <div
      className="border-edge-strong bg-surface/40 inline-flex items-center rounded-full border p-0.5"
      role="group"
      aria-label="Ranking window"
    >
      {STATS_WINDOWS.map((window) => {
        const isActive = window === activeWindow;
        return (
          <Link
            key={window}
            href={buildWindowHref(path, searchParams, window)}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              isActive ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {formatStatsWindowLabel(window, "short")}
          </Link>
        );
      })}
    </div>
  );
}
