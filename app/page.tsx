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
import { loadHomePageData } from "@/lib/home/load-home-page-data";
import { absoluteUrl } from "@/lib/seo/metadata";
import { buildWindowHref, formatStatsWindowLabel } from "@/lib/search-params/window";

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

function normalizeUnixSeconds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value > 1_000_000_000_000) return Math.floor(value / 1000);
  if (value > 1_000_000_000) return Math.floor(value);
  return null;
}

function formatFreshness(value: unknown): string | null {
  const unixSeconds = normalizeUnixSeconds(value);
  if (!unixSeconds) return null;
  const observedAt = new Date(unixSeconds * 1000);
  if (Number.isNaN(observedAt.getTime())) return null;
  return `Updated ${observedAt.toLocaleString()}`;
}

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
  } = await loadHomePageData(resolvedSearchParams);

  const trendWindowLabel = formatStatsWindowLabel(window);
  const topRelay = relayLeaders[0]?.relay;
  const topEventId = homeNotes[0]?.id ?? "0".repeat(64);
  const freshness = formatFreshness(homeNotes[0]?.created_at) ?? "Live now";
  const notesFreshness = formatFreshness(homeNotes[0]?.created_at) ?? "Updated recently";
  const profileActivityCandidates = hydratedHomeProfiles
    .map((profile) =>
      [
        profile.recent_activity_at,
        profile.last_activity_at,
        profile.updated_at,
        profile.created_at,
      ].map(normalizeUnixSeconds)
    )
    .flat()
    .filter((value): value is number => typeof value === "number");
  const latestProfileActivity =
    profileActivityCandidates.length > 0 ? Math.max(...profileActivityCandidates) : null;
  const profilesFreshness =
    formatFreshness(latestProfileActivity) ??
    formatFreshness(homeNotes[0]?.created_at) ??
    "Updated recently";
  const hashtagsFreshness = formatFreshness(homeNotes[0]?.created_at) ?? "Updated recently";
  const domainsFreshness = formatFreshness(homeNotes[0]?.created_at) ?? "Updated recently";
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
        {errorMessage ? (
          flagshipNotes.length > 0 || profileHighlights.length > 0 ? (
            <SoftRefreshNote message={errorMessage} />
          ) : (
            <ErrorPanel message={errorMessage} />
          )
        ) : null}
        <IndexedAt computedAt={computedAt} />
        <section className="border-edge/90 nm-panel-hero relative overflow-hidden rounded-[2rem] border p-5 sm:p-7 xl:p-9 2xl:px-10">
          <div aria-hidden className="nm-aurora-layer pointer-events-none absolute inset-0" />
          <div className="relative z-10 grid gap-7 sm:gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.72fr)] xl:items-start xl:gap-10 2xl:grid-cols-[minmax(0,1.52fr)_360px] 2xl:gap-12">
            <div className="space-y-6 sm:space-y-7">
              <div className="space-y-4 sm:space-y-5">
                <h1 className="text-ink max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl xl:max-w-[15ch] xl:text-[3.7rem] xl:leading-[1.02] 2xl:max-w-[16ch] 2xl:text-[4rem]">
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
                <span aria-hidden className="text-ink-faint/70">
                  •
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="nm-live-dot" aria-hidden />
                  {freshness}
                </span>
              </div>
            </div>
            <aside className="border-edge/90 bg-surface-sunken/35 rounded-[1.5rem] border p-4 sm:p-5 xl:self-stretch xl:justify-self-end xl:p-6">
              <p className="text-ink-faint text-[11px] font-medium tracking-[0.18em] uppercase">
                Snapshot
              </p>
              <dl className="border-edge/70 mt-4 space-y-3 border-t pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-faint">Window</dt>
                  <dd className="text-ink font-medium">{trendWindowLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-faint">Freshness</dt>
                  <dd className="text-ink font-medium">{freshness}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-faint">Top relay</dt>
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
              </dl>

              {heroPulseStats.length > 0 ? (
                <div className="border-edge/70 mt-5 space-y-2.5 border-t pt-4">
                  {heroPulseStats.map((stat) => (
                    <article
                      key={stat.label}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <p className="text-ink-faint text-[11px]">{stat.label}</p>
                      <p className="text-ink text-base font-semibold tracking-tight tabular-nums">
                        {typeof stat.value === "number"
                          ? formatCompactNumber(stat.value)
                          : String(stat.value)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}
            </aside>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.76fr)_minmax(320px,0.8fr)] xl:items-start xl:gap-7 2xl:grid-cols-[minmax(0,1.9fr)_minmax(340px,0.74fr)]">
          <section className="border-accent-soft/15 nm-panel-feature overflow-hidden rounded-[1.72rem] border p-5 ring-1 ring-white/5 sm:p-6 xl:p-7">
            <header className="mb-6 space-y-3.5 sm:mb-7">
              <div className="space-y-2.5">
                <h2 className="text-ink-strong text-[1.65rem] font-semibold tracking-tight sm:text-[2.05rem]">
                  The note to read first
                </h2>
                <p className="text-ink-muted max-w-3xl text-sm leading-6 sm:text-base">
                  One lead note with two strong follow-ups.
                </p>
              </div>
              <div className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span>{trendWindowLabel}</span>
                <span aria-hidden className="text-ink-faint/70">
                  •
                </span>
                <span>{notesFreshness}</span>
              </div>
            </header>
            {flagshipNotes.length > 0 ? (
              <TrendingFeaturedModule notes={flagshipNotes} authorsByPubkey={noteAuthorsByPubkey} />
            ) : (
              <div className="flex min-h-80 items-center">
                <EmptyState
                  title="Notes ranking is quiet"
                  message="No clear note movement was returned for this window."
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
          />
        </Suspense>
      </div>
    </div>
  );
}
