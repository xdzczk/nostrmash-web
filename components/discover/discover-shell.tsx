import Link from "@/components/app-link";
import type { ReactNode } from "react";

import { DiscoverTelemetry } from "@/components/discover/discover-telemetry";
import { RememberDiscoveryWindow } from "@/components/discover/remember-discovery-window";
import { DiscoverNav } from "@/components/explorer/discover-nav";
import { LanguageSelector } from "@/components/explorer/language-selector";
import { PageHero } from "@/components/explorer/page-hero";
import { WindowSelector } from "@/components/explorer/window-selector";
import { LiveRefresh } from "@/components/freshness/live-refresh";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { tabLinkPrefetch } from "@/components/ui/tab-styles";
import {
  DISCOVER_MODE_LINKS,
  modeLinkCarries,
  type DiscoverMode,
  type DiscoverView,
} from "@/lib/discover/views";
import { formatDiscoverEyebrow } from "@/lib/i18n/language-names";
import { buildDiscoverHref, buildExcludeBridgedHref } from "@/lib/search-params/language";
import { DEFAULT_STATS_WINDOW, STATS_WINDOWS, type StatsWindow } from "@/lib/search-params/window";
import type { TopLanguages } from "@/lib/types/api";

export function FreshnessBadge({ label }: { label: string }) {
  return (
    <span className="text-ink-muted inline-flex items-center gap-2">
      <span className="nm-live-dot" aria-hidden />
      {label}
    </span>
  );
}

export function DiscoverShell({
  view,
  mode = "default",
  eyebrow = "Discover",
  title,
  subtitle,
  path,
  searchParams,
  window,
  windows = STATS_WINDOWS,
  language,
  topLanguages,
  languageControl,
  freshnessLabel,
  freshness,
  rankingControls = true,
  showWindowControl,
  showLanguageControl,
  defaultWindow = DEFAULT_STATS_WINDOW,
  linkedWindow,
  rememberWindow = true,
  subtitleFromSm = true,
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
  /** Ranges the selector may offer. Hidden after this session's 30d request is rejected. */
  windows?: readonly StatsWindow[];
  language?: string;
  topLanguages?: TopLanguages;
  /** Streamed selector. When omitted, options come from `topLanguages`. */
  languageControl?: ReactNode;
  freshnessLabel?: string | null;
  /**
   * Streamed alternative to `freshnessLabel`: a node (typically wrapped in
   * Suspense) so the hero can render before the data it describes resolves.
   */
  freshness?: ReactNode;
  /** Window and language selectors together. Live passes false to hide both. */
  rankingControls?: boolean;
  /** Overrides `rankingControls` for the window selector alone. */
  showWindowControl?: boolean;
  /** Overrides `rankingControls` for the language selector alone. */
  showLanguageControl?: boolean;
  /** Range the selector omits from the URL. Most lists use 24h; zapped uses 7d and supported uses 30d. */
  defaultWindow?: StatsWindow;
  /**
   * Window copied onto category and mode links that keep one.
   * `null` copies nothing. Omit to copy `window`.
   */
  linkedWindow?: StatsWindow | null;
  /** Skip writing the 24h/7d cookie. Live must not replace the range the reader was using. */
  rememberWindow?: boolean;
  /** Phones hide the subtitle on the shared Discover lists. Rankings that explain a chip keep it. */
  subtitleFromSm?: boolean;
  staleMessage?: string | null;
  errorMessage?: string | null;
  hasContent?: boolean;
  heroSupport?: ReactNode;
  children: ReactNode;
}) {
  const modeLinks = DISCOVER_MODE_LINKS[view] ?? [];
  const query = searchParams.toString();
  const retryHref = query.length > 0 ? `${path}?${query}` : path;
  const showWindow = showWindowControl ?? rankingControls;
  const showLanguage = showLanguageControl ?? rankingControls;
  const carriedWindow = linkedWindow === null ? undefined : (linkedWindow ?? window);
  const excludeBridged = searchParams.get("exclude_bridged") === "true";
  const showRankingBadges =
    showWindow || showLanguage || Boolean(freshness) || Boolean(freshnessLabel) || rankingControls;

  return (
    <div className="min-w-0 space-y-6 sm:space-y-7">
      <DiscoverTelemetry view={view} mode={mode} window={window} language={language} />
      {rememberWindow ? <RememberDiscoveryWindow window={window} /> : null}
      <LiveRefresh />
      <PageHero
        eyebrow={formatDiscoverEyebrow(eyebrow, language)}
        title={title}
        subtitle={subtitle}
        subtitleFromSm={subtitleFromSm}
        badges={
          showRankingBadges ? (
            <div className="nm-meta flex flex-wrap items-center gap-x-3 gap-y-2">
              {showWindow || showLanguage ? (
                <>
                  {showWindow ? (
                    <WindowSelector
                      path={path}
                      searchParams={searchParams}
                      activeWindow={window}
                      windows={windows}
                      defaultWindow={defaultWindow}
                      persist={showWindow}
                    />
                  ) : null}
                  {showLanguage
                    ? (languageControl ?? (
                        <LanguageSelector
                          path={path}
                          query={searchParams.toString()}
                          activeLanguage={language}
                          options={topLanguages?.[window] ?? []}
                          prefetchLanguages
                        />
                      ))
                    : null}
                </>
              ) : null}
              {rankingControls ? (
                <Link
                  href={buildExcludeBridgedHref(path, searchParams)}
                  className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    excludeBridged
                      ? "border-accent/50 bg-surface text-ink"
                      : "border-edge-strong text-ink-muted hover:text-ink"
                  }`}
                >
                  Exclude bridged
                  <span className="sr-only">{excludeBridged ? ", on" : ", off"}</span>
                </Link>
              ) : null}
              {freshness ?? (freshnessLabel ? <FreshnessBadge label={freshnessLabel} /> : null)}
            </div>
          ) : undefined
        }
        support={heroSupport}
      />

      <div className="min-w-0 space-y-2.5">
        <DiscoverNav
          active={view}
          window={carriedWindow}
          lang={language}
          excludeBridged={excludeBridged}
        />
        {modeLinks.length > 1 ? (
          <nav aria-label={`${view} modes`} className="flex flex-wrap items-center gap-4">
            {modeLinks.map((item) => {
              const carries = modeLinkCarries(item);
              return (
                <Link
                  key={item.mode}
                  href={buildDiscoverHref(item.href, {
                    window: carries.window ? carriedWindow : undefined,
                    lang: carries.language ? language : undefined,
                    excludeBridged,
                  })}
                  prefetch={tabLinkPrefetch(true, item.mode === mode)}
                  aria-current={item.mode === mode ? "page" : undefined}
                  className={`nm-meta inline-flex min-h-6 items-center py-0.5 text-[13px] font-medium transition ${
                    item.mode === mode
                      ? "text-ink underline decoration-[var(--accent-soft)] decoration-2 underline-offset-4"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      {staleMessage ? <SoftRefreshNote message={staleMessage} /> : null}
      {errorMessage ? (
        hasContent ? (
          <SoftRefreshNote message={errorMessage} />
        ) : (
          <ErrorPanel message={errorMessage} retryHref={retryHref} />
        )
      ) : null}

      {children}

      <div className="border-edge/70 border-t pt-4">
        <Link href="/methodology" className="nm-action-link">
          How Discover rankings work
        </Link>
      </div>
    </div>
  );
}
