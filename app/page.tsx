import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/explorer/empty-state";
import { extractPrimitiveStats, isRecord } from "@/components/explorer/utils";
import { ClosingDiscoveryRail } from "@/components/home/closing-discovery-rail";
import { NetworkPulseStrip } from "@/components/home/network-pulse-strip";
import { ProfilesInMotionSpotlight } from "@/components/home/profiles-in-motion-spotlight";
import { TrendingFeaturedModule } from "@/components/home/trending-featured-module";
import { SearchForm } from "@/components/search/search-form";
import { ErrorPanel } from "@/components/ui/status-panels";
import { extractRelayRows } from "@/components/explorer/stats-utils";
import {
  getDiscoveryHome,
  getNetworkStats,
  getRelayStats,
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import { fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import type { Profile } from "@/lib/types/api";

export const metadata: Metadata = {
  title: "NostrMash",
  description:
    "Explore Nostr notes, profiles, relays, and live trends through a public discovery index.",
};

export default async function HomePage() {
  const asRecord = (value: unknown): Record<string, unknown> | null =>
    isRecord(value) ? value : null;
  const pickPreferredStats = (
    sources: Array<Record<string, unknown> | null | undefined>,
    preferredKeys: string[],
    limit: number
  ): Array<{ label: string; value: string | number | boolean }> => {
    const flattened = sources.flatMap((source) => extractPrimitiveStats(source ?? {}, []));
    if (flattened.length === 0) return [];

    const selected: Array<{ label: string; value: string | number | boolean }> = [];
    const usedLabels = new Set<string>();
    for (const key of preferredKeys) {
      const match = flattened.find((entry) => entry.label === key && !usedLabels.has(entry.label));
      if (!match) continue;
      selected.push(match);
      usedLabels.add(match.label);
      if (selected.length >= limit) return selected;
    }

    for (const entry of flattened) {
      if (usedLabels.has(entry.label)) continue;
      selected.push(entry);
      usedLabels.add(entry.label);
      if (selected.length >= limit) break;
    }

    return selected;
  };
  const networkPulsePreferredKeys = [
    "events_ingested",
    "projected_profiles",
    "active_authors_24h",
    "note_volume_24h",
    "relays_active_24h",
    "unique_authors_24h",
  ];
  const normalizeUnixSeconds = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    if (value > 1_000_000_000_000) return Math.floor(value / 1000);
    if (value > 1_000_000_000) return Math.floor(value);
    return null;
  };
  const formatFreshness = (value: unknown): string | null => {
    const unixSeconds = normalizeUnixSeconds(value);
    if (!unixSeconds) return null;
    const observedAt = new Date(unixSeconds * 1000);
    if (Number.isNaN(observedAt.getTime())) return null;
    return `Updated ${observedAt.toLocaleString()}`;
  };

  const hasRichIdentity = (profile: Profile | undefined): boolean => {
    if (!profile) return false;
    const displayName = typeof profile.display_name === "string" ? profile.display_name.trim() : "";
    const name = typeof profile.name === "string" ? profile.name.trim() : "";
    const picture = typeof profile.picture === "string" ? profile.picture.trim() : "";
    return displayName.length > 0 || name.length > 0 || picture.length > 0;
  };

  const failedMessages: string[] = [];
  let payload: Awaited<ReturnType<typeof getDiscoveryHome>> | null = null;
  let networkStats: Awaited<ReturnType<typeof getNetworkStats>> | null = null;
  let relayStats: Awaited<ReturnType<typeof getRelayStats>> | null = null;
  let trendingNotes: Awaited<ReturnType<typeof getTrendingNotes>> | null = null;
  let trendingProfiles: Awaited<ReturnType<typeof getTrendingProfiles>> | null = null;
  let trendingHashtags: Awaited<ReturnType<typeof getTrendingHashtags>> | null = null;
  let trendingDomains: Awaited<ReturnType<typeof getTrendingDomains>> | null = null;
  let noteAuthorsByPubkey: Record<string, Profile> = {};
  try {
    payload = await getDiscoveryHome("shortTtl");
  } catch (error) {
    failedMessages.push(
      error instanceof Error ? error.message : "Failed to load discovery home payload."
    );
  }

  let homeNotes = payload?.notes ?? [];
  let homeProfiles = payload?.profiles ?? [];
  let homeHashtags = payload?.hashtags ?? [];
  let homeDomains = payload?.domains ?? [];

  const needsNotesFallback = homeNotes.length === 0;
  const needsProfilesFallback = homeProfiles.length === 0;
  const needsHashtagsFallback = homeHashtags.length === 0;
  const needsDomainsFallback = homeDomains.length === 0;
  if (
    needsNotesFallback ||
    needsProfilesFallback ||
    needsHashtagsFallback ||
    needsDomainsFallback ||
    !payload
  ) {
    const fallbackRequests: Array<Promise<unknown>> = [];
    if (needsNotesFallback) fallbackRequests.push(getTrendingNotes("shortTtl"));
    if (needsProfilesFallback) fallbackRequests.push(getTrendingProfiles("shortTtl"));
    if (needsHashtagsFallback) fallbackRequests.push(getTrendingHashtags("shortTtl"));
    if (needsDomainsFallback) fallbackRequests.push(getTrendingDomains("shortTtl"));
    const fallbackResults = await Promise.allSettled(fallbackRequests);
    let fallbackIndex = 0;
    if (needsNotesFallback) {
      const result = fallbackResults[fallbackIndex];
      if (result?.status === "fulfilled") {
        trendingNotes = result.value as Awaited<ReturnType<typeof getTrendingNotes>>;
        homeNotes = trendingNotes.notes ?? [];
      } else if (result?.status === "rejected") {
        failedMessages.push(
          result.reason instanceof Error ? result.reason.message : "Failed to load trending notes."
        );
      }
      fallbackIndex += 1;
    }
    if (needsProfilesFallback) {
      const result = fallbackResults[fallbackIndex];
      if (result?.status === "fulfilled") {
        trendingProfiles = result.value as Awaited<ReturnType<typeof getTrendingProfiles>>;
        homeProfiles = trendingProfiles.profiles ?? [];
      } else if (result?.status === "rejected") {
        failedMessages.push(
          result.reason instanceof Error
            ? result.reason.message
            : "Failed to load trending profiles."
        );
      }
      fallbackIndex += 1;
    }
    if (needsHashtagsFallback) {
      const result = fallbackResults[fallbackIndex];
      if (result?.status === "fulfilled") {
        trendingHashtags = result.value as Awaited<ReturnType<typeof getTrendingHashtags>>;
        homeHashtags = trendingHashtags.hashtags ?? [];
      } else if (result?.status === "rejected") {
        failedMessages.push(
          result.reason instanceof Error
            ? result.reason.message
            : "Failed to load trending hashtags."
        );
      }
      fallbackIndex += 1;
    }
    if (needsDomainsFallback) {
      const result = fallbackResults[fallbackIndex];
      if (result?.status === "fulfilled") {
        trendingDomains = result.value as Awaited<ReturnType<typeof getTrendingDomains>>;
        homeDomains = trendingDomains.domains ?? [];
      } else if (result?.status === "rejected") {
        failedMessages.push(
          result.reason instanceof Error
            ? result.reason.message
            : "Failed to load trending domains."
        );
      }
    }
  }

  let hydratedHomeProfiles = homeProfiles;
  const notePreviewPubkeys = homeNotes
    .slice(0, 5)
    .map((note) => note.pubkey)
    .filter((pubkey): pubkey is string => typeof pubkey === "string" && pubkey.length > 0);
  const profilePreviewPubkeys = homeProfiles
    .slice(0, 5)
    .filter((profile) => !hasRichIdentity(profile))
    .map((profile) => profile.pubkey)
    .filter((pubkey): pubkey is string => typeof pubkey === "string" && pubkey.length > 0);
  const pubkeysToHydrate = Array.from(
    new Set([...notePreviewPubkeys, ...profilePreviewPubkeys].map((pubkey) => pubkey.toLowerCase()))
  );
  if (pubkeysToHydrate.length > 0) {
    try {
      noteAuthorsByPubkey = await fetchProfilesByPubkey(pubkeysToHydrate, "shortTtl");
      hydratedHomeProfiles = homeProfiles.map((profile) => {
        const key = typeof profile.pubkey === "string" ? profile.pubkey.toLowerCase() : "";
        const hydrated = key ? noteAuthorsByPubkey[key] : undefined;
        return { ...profile, ...(hydrated ?? {}) };
      });
    } catch {
      noteAuthorsByPubkey = {};
      hydratedHomeProfiles = homeProfiles;
    }
  }

  const sections = asRecord(payload?.sections);
  const networkSummary = asRecord(sections?.network_summary);

  const homeStats = isRecord(payload?.stats) ? payload.stats : {};
  let pulseStats = pickPreferredStats([homeStats], networkPulsePreferredKeys, 3);

  let relayLeaders = extractRelayRows(networkSummary ?? payload, 1);
  const needsNetworkFallback = pulseStats.length === 0 || relayLeaders.length === 0;
  if (needsNetworkFallback) {
    const fallbackStatsResults = await Promise.allSettled([
      getNetworkStats("shortTtl"),
      getRelayStats("shortTtl"),
    ]);
    const [networkResult, relayResult] = fallbackStatsResults;
    networkStats = networkResult.status === "fulfilled" ? networkResult.value : null;
    relayStats = relayResult.status === "fulfilled" ? relayResult.value : null;

    for (const result of fallbackStatsResults) {
      if (result.status === "rejected") {
        failedMessages.push(
          result.reason instanceof Error
            ? result.reason.message
            : "Failed to load network fallback."
        );
      }
    }
    if (pulseStats.length === 0) {
      pulseStats = pickPreferredStats(
        [isRecord(networkStats) ? networkStats : {}],
        networkPulsePreferredKeys,
        3
      );
    }
    if (relayLeaders.length === 0) {
      relayLeaders = extractRelayRows(relayStats, 1);
    }
  }

  const errorMessage = failedMessages.length > 0 ? failedMessages.join(" | ") : "";

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
  const trendWindowLabel = "Last 24h";
  const heroSearchShortcuts = [
    { label: "#bitcoin", query: "#bitcoin" },
    { label: "npub", query: "npub1..." },
    { label: "relay URL", query: "wss://relay.damus.io" },
    { label: "note ID", query: topEventId },
  ];
  const heroPulseStats = pulseStats.slice(0, 2);
  const flagshipNotes = homeNotes.slice(0, 3);
  const profileHighlights = hydratedHomeProfiles.slice(0, 3);
  const hashtagHighlights = homeHashtags.slice(0, 8);
  const domainHighlights = homeDomains.slice(0, 8);

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-[4.75rem]">
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-800/90 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.94),rgba(14,14,16,0.98))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-7 lg:p-8">
        <div className="grid gap-7 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-6 sm:space-y-7">
            <div className="space-y-4 sm:space-y-5">
              <p className="text-[11px] font-medium tracking-[0.22em] text-zinc-500 uppercase">
                Discovery surface
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-100 sm:text-5xl lg:text-[3.35rem]">
                Search, track, and inspect what is moving across Nostr.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                See leading notes, rising profiles, relay activity, and topic movement in one place.
              </p>
            </div>
            <SearchForm
              variant="hero"
              helperText="Search notes, profiles, hashtags, relays, and event IDs from one public index."
              shortcuts={heroSearchShortcuts}
            />
            <p className="max-w-xl text-xs leading-6 text-zinc-500">
              Backed by durable ingest and rebuildable indexes.
            </p>
          </div>
          <aside className="rounded-[1.5rem] border border-zinc-800/90 bg-zinc-950/35 p-4 sm:p-5">
            <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-500 uppercase">
              Current window
            </p>
            <p className="mt-3 text-lg font-semibold tracking-tight text-zinc-100">
              Start with the strongest signal.
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              The homepage leads with the note worth reading, then expands into the profiles,
              topics, and links around it.
            </p>
            <dl className="mt-5 space-y-3 border-t border-zinc-800/70 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-500">Window</dt>
                <dd className="font-medium text-zinc-100">{trendWindowLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-500">Freshness</dt>
                <dd className="font-medium text-zinc-100">{freshness}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-500">Top relay</dt>
                <dd className="min-w-0">
                  {topRelay ? (
                    <Link
                      href={`/relays/${encodeURIComponent(topRelay)}`}
                      className="truncate font-medium text-zinc-200 transition hover:text-indigo-200"
                    >
                      {topRelay}
                    </Link>
                  ) : (
                    <span className="font-medium text-zinc-100">Relay activity live</span>
                  )}
                </dd>
              </div>
            </dl>

            {heroPulseStats.length > 0 ? (
              <div className="mt-5 space-y-2.5 border-t border-zinc-800/70 pt-4">
                {heroPulseStats.map((stat) => (
                  <article
                    key={stat.label}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <p className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase">
                      {stat.label.replaceAll("_", " ")}
                    </p>
                    <p className="text-base font-semibold tracking-tight text-zinc-100">
                      {String(stat.value)}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] xl:items-start">
        <section className="overflow-hidden rounded-[1.65rem] border border-zinc-800/90 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_38%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(22,22,25,0.92))] p-5 shadow-[0_24px_80px_rgba(49,46,129,0.1)] sm:p-6">
          <header className="mb-5 space-y-3 sm:mb-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2.5 py-1 text-[11px] font-medium tracking-[0.18em] text-indigo-200 uppercase">
                Note ranking
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500">Top reads</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-[1.55rem] font-semibold tracking-tight text-zinc-50 sm:text-[2rem]">
                The note to read first
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                One lead note and two supporting picks surface the strongest activity first.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
              <span>{trendWindowLabel}</span>
              <span className="text-zinc-600">•</span>
              <span>{notesFreshness}</span>
            </div>
          </header>
          {flagshipNotes.length > 0 ? (
            <TrendingFeaturedModule notes={flagshipNotes} authorsByPubkey={noteAuthorsByPubkey} />
          ) : errorMessage ? (
            <div className="flex min-h-80 items-center">
              <ErrorPanel message={errorMessage} />
            </div>
          ) : (
            <div className="flex min-h-80 items-center">
              <EmptyState
                title="Notes ranking is quiet"
                message="No clear note movement was returned for this window."
              />
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
            <Link
              href="/trending/notes"
              className="font-medium text-zinc-200 hover:text-indigo-200"
            >
              See all trending notes
            </Link>
          </div>
        </section>

        <ProfilesInMotionSpotlight
          profiles={profileHighlights}
          trendWindowLabel={trendWindowLabel}
          freshnessLabel={profilesFreshness}
          errorMessage={errorMessage}
        />
      </div>

      <NetworkPulseStrip title="Network pulse" stats={pulseStats} />

      <ClosingDiscoveryRail
        hashtags={hashtagHighlights}
        domains={domainHighlights}
        trendWindowLabel={trendWindowLabel}
        hashtagsFreshness={hashtagsFreshness}
        domainsFreshness={domainsFreshness}
        errorMessage={errorMessage}
      />
    </div>
  );
}
