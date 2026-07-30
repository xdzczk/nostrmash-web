import Link from "next/link";
import type { ReactNode } from "react";

import { DiscoverTelemetry } from "@/components/discover/discover-telemetry";
import { DiscoverNav } from "@/components/explorer/discover-nav";
import { PageHero } from "@/components/explorer/page-hero";
import { WindowSelector } from "@/components/explorer/window-selector";
import { LiveRefresh } from "@/components/freshness/live-refresh";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { DISCOVER_MODE_LINKS, type DiscoverMode, type DiscoverView } from "@/lib/discover/views";
import type { StatsWindow } from "@/lib/search-params/window";

export function DiscoverShell({
  view,
  mode = "default",
  eyebrow = "Discover",
  title,
  subtitle,
  path,
  searchParams,
  window,
  freshnessLabel,
  staleMessage,
  errorMessage,
  hasContent = true,
  heroSupport,
  children,
}: {
  view: DiscoverView;
  mode?: DiscoverMode;
  eyebrow?: string;
  title: string;
  subtitle: string;
  path: string;
  searchParams: URLSearchParams;
  window: StatsWindow;
  freshnessLabel?: string | null;
  staleMessage?: string | null;
  errorMessage?: string | null;
  hasContent?: boolean;
  heroSupport?: ReactNode;
  children: ReactNode;
}) {
  const modeLinks = DISCOVER_MODE_LINKS[view] ?? [];

  return (
    <div className="space-y-8 sm:space-y-10">
      <DiscoverTelemetry view={view} mode={mode} window={window} />
      <LiveRefresh />
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        badges={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <WindowSelector path={path} searchParams={searchParams} activeWindow={window} />
            {freshnessLabel ? (
              <span className="text-ink-muted inline-flex items-center gap-1.5">
                <span className="nm-live-dot" aria-hidden />
                {freshnessLabel}
              </span>
            ) : null}
          </div>
        }
        support={heroSupport}
      />

      <div className="space-y-3">
        <DiscoverNav active={view} window={window} />
        {modeLinks.length > 1 ? (
          <nav aria-label={`${view} modes`} className="flex flex-wrap items-center gap-4">
            {modeLinks.map((item) => (
              <Link
                key={item.mode}
                href={`${item.href}?window=${window}`}
                aria-current={item.mode === mode ? "page" : undefined}
                className={`text-xs font-medium transition ${
                  item.mode === mode
                    ? "text-ink underline decoration-[var(--accent-soft)] decoration-2 underline-offset-4"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      {staleMessage ? <SoftRefreshNote message={staleMessage} /> : null}
      {errorMessage ? (
        hasContent ? (
          <SoftRefreshNote message={errorMessage} />
        ) : (
          <ErrorPanel message={errorMessage} />
        )
      ) : null}

      {children}

      <div className="border-edge/70 border-t pt-4">
        <Link href="/methodology" className="text-ink-muted hover:text-ink text-xs">
          How Discover rankings work
        </Link>
      </div>
    </div>
  );
}
