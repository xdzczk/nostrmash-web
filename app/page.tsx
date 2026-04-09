import Link from "next/link";
import type { Metadata } from "next";

import { ConsistencyBadge } from "@/components/explorer/consistency-badge";
import { EmptyState } from "@/components/explorer/empty-state";
import { extractPrimitiveStats, isRecord } from "@/components/explorer/utils";
import { MetadataList } from "@/components/explorer/metadata-list";
import { NetworkPulseStrip } from "@/components/home/network-pulse-strip";
import { QuickEntryGrid } from "@/components/home/quick-entry-grid";
import { SystemPosturePanel } from "@/components/home/system-posture-panel";
import { SearchForm } from "@/components/search/search-form";
import { NotesList, ProfilesList, HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { extractRelayRows } from "@/components/explorer/stats-utils";
import {
  getDiscoveryHome,
  getProfilesBatch,
  getContentStats,
  getNetworkStats,
  getRelayStats,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import type { Profile } from "@/lib/types/api";

export const metadata: Metadata = {
  title: "NostrMash",
  description:
    "Durable Nostr read layer for compatible search, trend observability, and calm operations.",
};

export default async function HomePage() {
  const asRecord = (value: unknown): Record<string, unknown> | null =>
    isRecord(value) ? value : null;
  const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
  const isNonNull = <T,>(value: T | null): value is T => value !== null;
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
  const networkNowPreferredKeys = [
    "events_ingested",
    "projected_profiles",
    "active_24h",
    "active_relays",
    "active_authors",
    "active_authors_24h",
    "note_volume_24h",
    "total_nodes",
    "event_count",
    "note_count",
    "relay_count",
    "total_relays",
  ];

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
  let contentStats: Awaited<ReturnType<typeof getContentStats>> | null = null;
  let relayStats: Awaited<ReturnType<typeof getRelayStats>> | null = null;
  let trendingNotes: Awaited<ReturnType<typeof getTrendingNotes>> | null = null;
  let trendingProfiles: Awaited<ReturnType<typeof getTrendingProfiles>> | null = null;
  let trendingHashtags: Awaited<ReturnType<typeof getTrendingHashtags>> | null = null;
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

  const needsNotesFallback = homeNotes.length === 0;
  const needsProfilesFallback = homeProfiles.length === 0;
  const needsHashtagsFallback = homeHashtags.length === 0;
  if (needsNotesFallback || needsProfilesFallback || needsHashtagsFallback || !payload) {
    const fallbackRequests: Array<Promise<unknown>> = [];
    if (needsNotesFallback) fallbackRequests.push(getTrendingNotes("shortTtl"));
    if (needsProfilesFallback) fallbackRequests.push(getTrendingProfiles("shortTtl"));
    if (needsHashtagsFallback) fallbackRequests.push(getTrendingHashtags("shortTtl"));
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
      const hydratedProfilesBatch = await getProfilesBatch(pubkeysToHydrate, "shortTtl");
      const hydratedByPubkey = new Map(
        hydratedProfilesBatch
          .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
          .map((profile) => [profile.pubkey.toLowerCase(), profile] as const)
      );
      noteAuthorsByPubkey = Object.fromEntries(hydratedByPubkey.entries());
      hydratedHomeProfiles = homeProfiles.map((profile) => {
        const key = typeof profile.pubkey === "string" ? profile.pubkey.toLowerCase() : "";
        const hydrated = key ? hydratedByPubkey.get(key) : undefined;
        return { ...profile, ...(hydrated ?? {}) };
      });
    } catch {
      noteAuthorsByPubkey = {};
      hydratedHomeProfiles = homeProfiles;
    }
  }

  const sections = asRecord(payload?.sections);
  const networkSummary = asRecord(sections?.network_summary);
  const networkTotals = asRecord(networkSummary?.totals);
  const networkActivity = asRecord(networkSummary?.activity);
  const networkRelays = asRecord(networkSummary?.relays);

  const homeStats = isRecord(payload?.stats) ? payload.stats : {};
  let pulseStats = pickPreferredStats([homeStats], networkPulsePreferredKeys, 4);
  let networkNowStats = pickPreferredStats(
    [networkTotals, networkRelays, networkActivity, homeStats],
    networkNowPreferredKeys,
    6
  );
  if (networkNowStats.length === 0) {
    networkNowStats = pickPreferredStats([homeStats], networkNowPreferredKeys, 6);
  }

  let relayLeaders = extractRelayRows(networkSummary ?? payload, 1);
  const needsNetworkFallback =
    networkNowStats.length === 0 || pulseStats.length === 0 || relayLeaders.length === 0;
  if (needsNetworkFallback) {
    const fallbackStatsResults = await Promise.allSettled([
      getNetworkStats("shortTtl"),
      getContentStats("shortTtl"),
      getRelayStats("shortTtl"),
    ]);
    const [networkResult, contentResult, relayResult] = fallbackStatsResults;
    networkStats = networkResult.status === "fulfilled" ? networkResult.value : null;
    contentStats = contentResult.status === "fulfilled" ? contentResult.value : null;
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
    if (networkNowStats.length === 0) {
      networkNowStats = pickPreferredStats(
        [
          isRecord(networkStats) ? networkStats : {},
          isRecord(contentStats) ? contentStats : {},
          isRecord(relayStats) ? relayStats : {},
        ],
        networkNowPreferredKeys,
        6
      );
    }
    if (pulseStats.length === 0) {
      pulseStats = pickPreferredStats(
        [isRecord(networkStats) ? networkStats : {}],
        networkPulsePreferredKeys,
        4
      );
    }
    if (relayLeaders.length === 0) {
      relayLeaders = extractRelayRows(relayStats, 1);
    }
  }

  const discoverySnippetSources = [
    { key: "hashtags", title: "Hashtag discovery" },
    { key: "domains", title: "Domain discovery" },
    { key: "home_discovery", title: "Home discovery" },
  ] as const;
  const extractSnippetText = (entry: unknown): string => {
    if (typeof entry === "string" && entry.trim().length > 0) return entry.trim();
    const record = asRecord(entry);
    if (!record) return "";
    for (const key of [
      "label",
      "name",
      "domain",
      "host",
      "hashtag",
      "tag",
      "value",
      "query",
      "text",
    ]) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) return value.trim();
    }
    return "";
  };
  const discoverySnippetGroups = discoverySnippetSources
    .map((source) => {
      const sectionValue =
        asArray(sections?.[source.key]).length > 0
          ? asArray(sections?.[source.key])
          : asArray(payload?.[source.key]);
      const snippets = sectionValue
        .map(extractSnippetText)
        .filter((entry) => entry.length > 0)
        .slice(0, 8);
      return snippets.length > 0 ? { title: source.title, snippets } : null;
    })
    .filter(isNonNull);

  const resultScopeValue = payload?.result_scope;
  const heroScope =
    typeof resultScopeValue === "string"
      ? resultScopeValue
      : isRecord(resultScopeValue)
        ? Object.entries(resultScopeValue)
            .slice(0, 2)
            .map(([key, value]) => `${key}: ${String(value)}`)
            .join(" • ")
        : undefined;
  const heroTrustMode = typeof payload?.trust_mode === "string" ? payload.trust_mode : undefined;
  const heroTrustApplied =
    typeof payload?.trust_applied === "boolean" ? payload.trust_applied : undefined;
  const errorMessage = failedMessages.length > 0 ? failedMessages.join(" | ") : "";
  const heroBadges = [
    typeof payload?.consistency === "string" ? payload.consistency : undefined,
    typeof networkStats?.consistency === "string" ? networkStats.consistency : undefined,
    typeof contentStats?.consistency === "string" ? contentStats.consistency : undefined,
    typeof relayStats?.consistency === "string" ? relayStats.consistency : undefined,
  ].filter((value): value is string => typeof value === "string");

  const quickLinks = [
    {
      href: "/trending",
      label: "Open trending surfaces",
      description: "Compare ranked notes, profiles, and hashtags in current windows.",
    },
    {
      href: "/stats",
      label: "Inspect stats surfaces",
      description: "Read network, content, and relay metrics from one operational view.",
    },
    {
      href: "/search",
      label: "Run direct search",
      description: "Query notes, profiles, and hashtags against the public index.",
    },
    {
      href: `/relays/${encodeURIComponent(relayLeaders[0]?.relay ?? "relay.damus.io")}`,
      label: "Inspect relay host",
      description: "Open relay-level metrics and read-path context.",
    },
  ];

  const leadingSignals = [
    {
      label: "Leading note",
      value: homeNotes[0]?.id ? homeNotes[0].id : "Unavailable in this window",
    },
    {
      label: "Leading profile",
      value: homeProfiles[0]?.pubkey ? homeProfiles[0].pubkey : "Unavailable in this window",
    },
    {
      label: "Leading hashtag",
      value: homeHashtags[0]?.hashtag
        ? `#${homeHashtags[0].hashtag}`
        : "Unavailable in this window",
    },
    {
      label: "Leading relay",
      value: relayLeaders[0]?.relay ?? "Unavailable in this window",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-5 sm:p-6 lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase">
                Public observability
              </p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
                Durable index. Compatible reads.
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">
                NostrMash keeps canonical ingest in durable storage and serves calm explorer reads
                for search, trends, and relay inspection.
              </p>
            </div>
            {heroBadges.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {heroBadges.map((consistency, index) => (
                  <ConsistencyBadge key={`${consistency}-${index}`} consistency={consistency} />
                ))}
              </div>
            ) : null}
            <SearchForm
              variant="hero"
              helperText="Search the public index, inspect current trend windows, or jump to relay entities."
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
              <span>Durable core stays separate from explorer views.</span>
              <span className="text-zinc-700">•</span>
              <span>Trend outputs reflect current public API ranking windows.</span>
            </div>
            {heroScope || heroTrustMode || heroTrustApplied !== undefined ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                {heroScope ? <span>Result scope: {heroScope}</span> : null}
                {heroTrustMode ? <span>Trust mode: {heroTrustMode}</span> : null}
                {heroTrustApplied !== undefined ? (
                  <span>Trust applied: {heroTrustApplied ? "yes" : "no"}</span>
                ) : null}
              </div>
            ) : null}
          </div>
          <SystemPosturePanel />
        </div>
      </section>

      <NetworkPulseStrip title="Network now" stats={networkNowStats} />

      <NetworkPulseStrip title="Network pulse" stats={pulseStats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Trending now"
          description="Top ranked notes from current discovery outputs."
        >
          {homeNotes.length > 0 ? (
            <NotesList notes={homeNotes.slice(0, 5)} authorsByPubkey={noteAuthorsByPubkey} ranked />
          ) : errorMessage ? (
            <ErrorPanel message={errorMessage} />
          ) : (
            <EmptyState
              title="Notes ranking is sparse"
              message="No ranked notes were returned for the current trend window."
            />
          )}
          <Link href="/trending/notes" className="mt-3 inline-block text-sm text-indigo-300">
            View all trending notes
          </Link>
        </SectionCard>

        <SectionCard
          title="Profiles in motion"
          description="Profiles surfacing with current trend momentum."
        >
          {hydratedHomeProfiles.length > 0 ? (
            <ProfilesList profiles={hydratedHomeProfiles.slice(0, 5)} ranked />
          ) : errorMessage ? (
            <ErrorPanel message={errorMessage} />
          ) : (
            <EmptyState
              title="Profile ranking is sparse"
              message="No ranked profiles were returned for the current trend window."
            />
          )}
          <Link href="/trending/profiles" className="mt-3 inline-block text-sm text-indigo-300">
            View all trending profiles
          </Link>
        </SectionCard>
      </div>

      <SectionCard
        title="Hashtag pulse"
        description="Hashtag movement from the active index window."
      >
        {homeHashtags.length > 0 ? (
          <HashtagsList hashtags={homeHashtags.slice(0, 12)} ranked searchable />
        ) : errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : (
          <EmptyState
            title="Hashtag ranking is sparse"
            message="No ranked hashtag activity was returned for the active window."
          />
        )}
        <Link href="/trending/hashtags" className="mt-3 inline-block text-sm text-indigo-300">
          View all trending hashtags
        </Link>
      </SectionCard>

      {discoverySnippetGroups.length > 0 ? (
        <SectionCard
          title="Discovery snippets"
          description="Hashtag, domain, and home snippets surfaced by discovery home sections."
        >
          <div className="space-y-3">
            {discoverySnippetGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
                  {group.title}
                </p>
                <MetadataList
                  items={group.snippets.map((snippet, index) => ({
                    label: `snippet ${index + 1}`,
                    value: snippet,
                  }))}
                  columns={2}
                  normalizeLabels={false}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Quick entry points"
        description="Navigate directly to high-signal explorer routes."
      >
        <QuickEntryGrid links={quickLinks} leadingSignals={leadingSignals} />
      </SectionCard>
    </div>
  );
}
