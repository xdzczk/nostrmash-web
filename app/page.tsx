import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { DiscoveryActionLinks } from "@/components/explorer/card-grammar";
import { EmptyState } from "@/components/explorer/empty-state";
import { WindowSelector } from "@/components/explorer/window-selector";
import { formatCompactNumber, truncateIdentifier } from "@/components/explorer/utils";
import { IndexedAt } from "@/components/freshness/indexed-at";
import { LiveRefresh } from "@/components/freshness/live-refresh";
import { ClosingDiscoveryRail } from "@/components/home/closing-discovery-rail";
import { DeferredNetworkPulse } from "@/components/home/deferred-network-pulse";
import { ProfilesInMotionSpotlight } from "@/components/home/profiles-in-motion-spotlight";
import { TrendingFeaturedModule } from "@/components/home/trending-featured-module";
import { SearchForm } from "@/components/search/search-form";
import { JsonLd } from "@/components/seo/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { getStaleDataNotice } from "@/lib/api/http";
import { loadHomePageData } from "@/lib/home/load-home-page-data";
import { absoluteUrl } from "@/lib/seo/metadata";
import { buildWindowHref, formatStatsWindowLabel } from "@/lib/search-params/window";
import { formatUpdatedRelative, isFreshTimestamp } from "@/lib/time/freshness";

export const metadata: Metadata = {
  title: "NostrMash",
  description:
    "Explore Nostr notes, profiles, relays, and live trends through a public discovery index.",
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/feeds/trending-notes.xml", title: "Trending notes" }],
    },
  },
};
export const revalidate = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const {
    window,
    currentSearchParams,
    errorMessage,
    homeNotes,
    hydratedHomeProfiles,
    homeHashtags,
    homeDomains,
    noteAuthorsByPubkey,
    pulseStats,
    relayLeaders,
    computedAt,
    sectionFailures,
  } = await loadHomePageData(resolvedSearchParams);

  const trendWindowLabel = formatStatsWindowLabel(window);
  const topRelay = relayLeaders[0]?.relay;
  const topEventId = homeNotes[0]?.id ?? "0".repeat(64);
  const freshness = formatUpdatedRelative(computedAt);
  const indexIsFresh = isFreshTimestamp(computedAt);
  const notesFreshness = freshness;
  const profilesFreshness = freshness;
  const hashtagsFreshness = freshness;
  const domainsFreshness = freshness;
  const staleNotice = getStaleDataNotice();
  const trendingNotesHref = buildWindowHref("/trending/notes", currentSearchParams, window);
  const heroSearchShortcuts = [
    { label: "#bitcoin", query: "#bitcoin" },
    { label: "npub", query: "npub1..." },
    { label: "relay URL", query: "wss://relay.damus.io" },
    { label: "note ID", query: topEventId },
  ];
  const heroPulseLabels: Record<string, string> = {
    events_ingested: "Events ingested",
    projected_profiles: "Projected profiles",
  };
  const heroPulseStats = ["events_ingested", "projected_profiles"]
    .map((key) => {
      const match = pulseStats.find((stat) => stat.label === key);
      if (!match) return null;
      return { ...match, label: heroPulseLabels[key] ?? match.label };
    })
    .filter(
      (
        stat
      ): stat is {
        label: string;
        value: string | number | boolean;
        series?: (typeof pulseStats)[number]["series"];
      } => stat !== null
    );
  const flagshipNotes = homeNotes.slice(0, 3);
  const profileHighlights = hydratedHomeProfiles.slice(0, 3);
  const hashtagHighlights = homeHashtags.slice(0, 8);
  const domainHighlights = homeDomains.slice(0, 8);

  return (
    <div className="relative left-1/2 w-screen max-w-none -translate-x-1/2 px-4 sm:px-5 xl:px-8 2xl:px-10">
      <LiveRefresh />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "NostrMash",
          url: absoluteUrl("/"),
          potentialAction: {
            "@type": "SearchAction",
            target: `${absoluteUrl("/search")}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <div className="mx-auto w-full max-w-[92rem] space-y-12 sm:space-y-16 xl:space-y-[5.1rem]">
        {staleNotice ? <SoftRefreshNote message={staleNotice} /> : null}
        {errorMessage ? (
          flagshipNotes.length > 0 || profileHighlights.length > 0 ? (
            <SoftRefreshNote message={errorMessage} />
          ) : (
            <ErrorPanel message={errorMessage} />
          )
        ) : null}
        <IndexedAt computedAt={computedAt} />
        <section className="border-edge/90 nm-panel-hero relative rounded-[2rem] border p-5 sm:p-7 xl:p-9 2xl:px-10">
          {/* Clip aurora to the rounded panel without clipping the search dropdown. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]"
          >
            <div className="nm-aurora-layer absolute inset-0" />
          </div>
          <div className="relative z-10 grid gap-7 sm:gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.72fr)] lg:items-start lg:gap-10 2xl:grid-cols-[minmax(0,1.52fr)_360px] 2xl:gap-12">
            <div className="space-y-6 sm:space-y-7">
              <div className="space-y-4 sm:space-y-5">
                <h1 className="nm-display-xl text-ink max-w-4xl lg:max-w-[15ch] 2xl:max-w-[16ch]">
                  Track what is moving on Nostr.
                </h1>
                <p className="text-ink-muted max-w-2xl text-sm leading-6 sm:text-base">
                  One index for the lead note, rising profiles, relay pulse, and fast-moving topics.
                </p>
              </div>
              <SearchForm
                className="max-w-[56rem]"
                variant="hero"
                helperText="Search notes, profiles, hashtags, relays, and event IDs."
                shortcuts={heroSearchShortcuts}
              />
              <div className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <WindowSelector path="/" searchParams={currentSearchParams} activeWindow={window} />
                <span>{trendWindowLabel}</span>
                {freshness ? (
                  <>
                    <span aria-hidden className="text-ink-faint/70">
                      •
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {indexIsFresh ? <span className="nm-live-dot" aria-hidden /> : null}
                      {freshness}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <aside className="border-edge/90 bg-surface-sunken/35 rounded-[1.5rem] border p-4 sm:p-5 lg:self-stretch lg:justify-self-end lg:p-6">
              <p className="text-ink-faint text-[11px] font-medium tracking-[0.18em] uppercase">
                Snapshot
              </p>
              <dl className="border-edge/70 mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 text-sm sm:mt-4 sm:space-y-0 sm:border-t sm:pt-4 lg:grid-cols-1 lg:gap-y-3">
                <div className="flex min-w-0 flex-col gap-0.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
                  <dt className="text-ink-faint text-[11px] lg:text-sm">Window</dt>
                  <dd className="text-ink truncate font-medium">{trendWindowLabel}</dd>
                </div>
                {freshness ? (
                  <div className="flex min-w-0 flex-col gap-0.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
                    <dt className="text-ink-faint text-[11px] lg:text-sm">Freshness</dt>
                    <dd className="text-ink truncate font-medium">{freshness}</dd>
                  </div>
                ) : null}
                <div className="col-span-2 flex min-w-0 flex-col gap-0.5 lg:col-span-1 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
                  <dt className="text-ink-faint text-[11px] lg:text-sm">Top relay</dt>
                  <dd className="min-w-0">
                    {topRelay ? (
                      <Link
                        href={`/relays/${encodeURIComponent(topRelay)}`}
                        title={topRelay}
                        className="hover:text-link-hover text-ink-soft truncate font-medium transition"
                      >
                        {truncateIdentifier(topRelay, "relay", "primary")}
                      </Link>
                    ) : (
                      <span className="text-ink font-medium">Relay activity live</span>
                    )}
                  </dd>
                </div>
                {heroPulseStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex min-w-0 flex-col gap-0.5 lg:flex-row lg:items-baseline lg:justify-between lg:gap-3"
                  >
                    <dt className="text-ink-faint text-[11px]">{stat.label}</dt>
                    <dd className="text-ink text-base font-semibold tracking-tight tabular-nums">
                      {typeof stat.value === "number"
                        ? formatCompactNumber(stat.value)
                        : String(stat.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.76fr)_minmax(300px,0.8fr)] lg:items-start lg:gap-7 2xl:grid-cols-[minmax(0,1.9fr)_minmax(340px,0.74fr)]">
          <section className="border-accent-soft/15 nm-panel-feature overflow-hidden rounded-[1.72rem] border p-5 ring-1 ring-white/5 sm:p-6 xl:p-7">
            <header className="mb-6 space-y-3.5 sm:mb-7">
              <div className="space-y-2.5">
                <h2 className="nm-display-lg text-ink-strong">The note to read first</h2>
                <p className="text-ink-muted max-w-3xl text-sm leading-6 sm:text-base">
                  One lead note with two strong follow-ups.
                </p>
              </div>
              <div className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span>{trendWindowLabel}</span>
                {notesFreshness ? (
                  <>
                    <span aria-hidden className="text-ink-faint/70">
                      •
                    </span>
                    <span>{notesFreshness}</span>
                  </>
                ) : null}
              </div>
            </header>
            {flagshipNotes.length > 0 ? (
              <TrendingFeaturedModule notes={flagshipNotes} authorsByPubkey={noteAuthorsByPubkey} />
            ) : (
              <div className="flex min-h-80 items-center">
                <EmptyState
                  title={
                    sectionFailures.notes
                      ? "Couldn't refresh this section"
                      : "Notes ranking is quiet"
                  }
                  message={
                    sectionFailures.notes
                      ? "It will retry shortly."
                      : "No clear note movement was returned for this window."
                  }
                />
              </div>
            )}
            <DiscoveryActionLinks
              actions={[{ label: "See all trending notes", href: trendingNotesHref }]}
              className="text-ink-faint mt-6 text-sm"
            />
          </section>

          <ProfilesInMotionSpotlight
            profiles={profileHighlights}
            trendWindowLabel={trendWindowLabel}
            freshnessLabel={profilesFreshness}
            degraded={sectionFailures.profiles}
          />
        </div>

        <Suspense fallback={<Skeleton className="h-28 w-full rounded-[1.5rem]" />}>
          <DeferredNetworkPulse window={window} seedStats={pulseStats} />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-40 w-full rounded-[1.5rem]" />}>
          <ClosingDiscoveryRail
            hashtags={hashtagHighlights}
            domains={domainHighlights}
            trendWindowLabel={trendWindowLabel}
            hashtagsFreshness={hashtagsFreshness}
            domainsFreshness={domainsFreshness}
            hashtagsDegraded={sectionFailures.hashtags}
            domainsDegraded={sectionFailures.domains}
          />
        </Suspense>
      </div>
    </div>
  );
}
