import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/explorer/empty-state";
import { extractPrimitiveStats, isRecord } from "@/components/explorer/utils";
import { MetadataList } from "@/components/explorer/metadata-list";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { DiscoveryQuickStartPanel } from "@/components/home/discovery-quick-start-panel";
import { NetworkPulseStrip } from "@/components/home/network-pulse-strip";
import { QuickEntryGrid } from "@/components/home/quick-entry-grid";
import { SearchForm } from "@/components/search/search-form";
import { NotesList, ProfilesList, HashtagsList, DomainsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { extractRelayRows } from "@/components/explorer/stats-utils";
import {
  getDiscoveryHome,
  getContentStats,
  getNetworkStats,
  getRelayStats,
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import type { Profile } from "@/lib/types/api";

export const metadata: Metadata = {
  title: "NostrMash",
  description:
    "Explore Nostr notes, profiles, relays, and trends through a public discovery surface backed by durable ingest.",
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
  const formatScopeValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };
  const formatResultScope = (value: unknown): string | null => {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    if (!isRecord(value)) return null;
    const entries = Object.entries(value).slice(0, 2);
    if (entries.length === 0) return null;
    return entries.map(([key, entry]) => `${key}: ${formatScopeValue(entry)}`).join(" • ");
  };
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
  let contentStats: Awaited<ReturnType<typeof getContentStats>> | null = null;
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

  const errorMessage = failedMessages.length > 0 ? failedMessages.join(" | ") : "";
  const semantics = extractNativeApiSemantics(payload, networkStats, contentStats, relayStats);
  const hasSemantics =
    semantics.consistency !== undefined ||
    semantics.trust_mode !== undefined ||
    semantics.trust_applied !== undefined ||
    semantics.result_scope !== undefined;

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
      href: `/hashtags/${encodeURIComponent(homeHashtags[0]?.hashtag ?? "nostr")}`,
      label: "Open leading hashtag",
      description: "Jump directly into hashtag explorer context and related tag loops.",
    },
    {
      href: `/domains/${encodeURIComponent(homeDomains[0]?.domain ?? "nostr.com")}`,
      label: "Open leading domain",
      description: "Inspect what note activity is surfacing from this domain right now.",
    },
    {
      href: "/relays",
      label: "Open relay explorer",
      description: "Rank active relays and inspect where activity is concentrated.",
    },
    {
      href: `/relays/${encodeURIComponent(relayLeaders[0]?.relay ?? "relay.damus.io")}`,
      label: "Inspect leading relay",
      description: "Open relay-level stats and health posture for the current leader.",
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
    {
      label: "Leading domain",
      value: homeDomains[0]?.domain ?? "Unavailable in this window",
    },
  ];
  const topHashtag = homeHashtags[0]?.hashtag;
  const topRelay = relayLeaders[0]?.relay;
  const topEventId = homeNotes[0]?.id ?? "0".repeat(64);
  const topProfile = hydratedHomeProfiles[0]?.pubkey ?? homeProfiles[0]?.pubkey;
  const currentScope = formatResultScope(semantics.result_scope) ?? "Current discovery scope";
  const freshness = formatFreshness(homeNotes[0]?.created_at) ?? "Live ingest active";
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
  const trendWindowLabel = "24h trend window";
  const quickStartActions = [
    {
      href: "/trending/notes",
      label: "Explore trending notes",
      description: "Open ranked notes and inspect current high-signal activity.",
    },
    {
      href: "/trending/profiles",
      label: "View active profiles",
      description: "Inspect profiles rising in the current discovery window.",
    },
    {
      href: "/trending/hashtags",
      label: "Inspect current hashtags",
      description: "Jump into hashtags with the strongest live momentum.",
    },
    {
      href: topRelay ? `/relays/${encodeURIComponent(topRelay)}` : "/relays",
      label: "Open relay activity",
      description: "Check where ingest and relay-side activity are concentrated.",
    },
    {
      href: `/search?q=${encodeURIComponent(topEventId)}`,
      label: "Search raw event by ID",
      description: "Use the top event as a starter, then pivot to any note ID.",
    },
    {
      href: topHashtag ? `/hashtags/${encodeURIComponent(topHashtag)}` : "/trending",
      label: "Browse current discovery window",
      description: "Start from a live anchor and expand into related entities.",
    },
  ];
  const quickStartMetadata = [
    { label: "Freshness", value: freshness },
    { label: "Time window", value: currentScope },
    {
      label: "Indexed entities",
      value:
        `${homeNotes.length.toLocaleString()} notes • ` +
        `${homeProfiles.length.toLocaleString()} profiles • ` +
        `${homeHashtags.length.toLocaleString()} hashtags`,
    },
  ];
  const heroSearchShortcuts = [
    { label: "#bitcoin", query: "#bitcoin" },
    { label: "relay URL", query: "wss://relay.damus.io" },
    { label: "npub", query: "npub1..." },
    { label: "note ID", query: topEventId },
    {
      label: "trending hashtag",
      href: topHashtag ? `/hashtags/${encodeURIComponent(topHashtag)}` : "/trending/hashtags",
    },
    {
      label: "example profile",
      href: topProfile ? `/profiles/${encodeURIComponent(topProfile)}` : "/trending/profiles",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-4 sm:p-6 lg:p-7">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="space-y-4 sm:space-y-5">
            <div className="space-y-2.5 sm:space-y-3">
              <p className="text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase">
                Nostr explorer
              </p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
                Search, discover, inspect, and analyze what is moving across Nostr.
              </h1>
              <p className="max-w-3xl text-sm leading-5 text-zinc-300 sm:text-base sm:leading-6">
                Track ranked notes, rising profiles, relay activity, and hashtag momentum from one
                focused surface.
              </p>
            </div>
            {hasSemantics ? (
              <div className="flex flex-wrap items-center gap-2">
                <NativeSemanticsBadges semantics={semantics} />
              </div>
            ) : null}
            <SearchForm
              variant="hero"
              helperText="Search across notes, profiles, hashtags, relays, and event IDs to jump straight into explorer routes."
              shortcuts={heroSearchShortcuts}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
              <span>
                Explore current discovery windows across notes, profiles, hashtags, domains, and
                relays.
              </span>
              <span className="text-zinc-700">•</span>
              <span>Powered by durable ingest and rebuildable derived views.</span>
            </div>
          </div>
          <DiscoveryQuickStartPanel actions={quickStartActions} metadata={quickStartMetadata} />
        </div>
      </section>

      <NetworkPulseStrip title="Network snapshot" stats={networkNowStats} />

      <NetworkPulseStrip title="Current discovery pulse" stats={pulseStats} />

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <SectionCard
          title="Trending now"
          description="Top ranked notes in the current trend window with direct thread and relay pivots."
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 sm:mb-4">
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {trendWindowLabel}
            </span>
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {notesFreshness}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
              Live rank movers
            </span>
          </div>
          {homeNotes.length > 0 ? (
            <NotesList
              notes={homeNotes.slice(0, 5)}
              authorsByPubkey={noteAuthorsByPubkey}
              ranked
              discoverySignals
            />
          ) : errorMessage ? (
            <ErrorPanel message={errorMessage} />
          ) : (
            <EmptyState
              title="Notes ranking is sparse"
              message="No ranked notes were returned for the current trend window."
            />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-300">
            <Link href="/trending/notes" className="hover:text-indigo-200">
              Open trend view
            </Link>
            <span className="text-zinc-600">•</span>
            <Link href="/trending/notes" className="hover:text-indigo-200">
              Compare note ranks
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Profiles in motion"
          description="Profiles gaining visibility across recent activity with direct authored-note pivots."
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 sm:mb-4">
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {trendWindowLabel}
            </span>
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {profilesFreshness}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
              Visibility movers
            </span>
          </div>
          {hydratedHomeProfiles.length > 0 ? (
            <ProfilesList profiles={hydratedHomeProfiles.slice(0, 5)} ranked discoverySignals />
          ) : errorMessage ? (
            <ErrorPanel message={errorMessage} />
          ) : (
            <EmptyState
              title="Profile ranking is sparse"
              message="No ranked profiles were returned for the current trend window."
            />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-300">
            <Link href="/trending/profiles" className="hover:text-indigo-200">
              Open trend view
            </Link>
            <span className="text-zinc-600">•</span>
            <Link href="/discovery/profiles/rising" className="hover:text-indigo-200">
              Inspect rising profiles
            </Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Hashtags accelerating"
        description="Hashtags rising faster than baseline in the active discovery window."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 sm:mb-4">
          <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
            {trendWindowLabel}
          </span>
          <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
            {hashtagsFreshness}
          </span>
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-indigo-300">
            Mention-lift rank
          </span>
        </div>
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
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-300">
          <Link href="/trending/hashtags" className="hover:text-indigo-200">
            Open trend view
          </Link>
          <span className="text-zinc-600">•</span>
          <Link href="/search?tab=all" className="hover:text-indigo-200">
            Search related notes
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Links gaining traction"
        description="Domains ranking higher in current note discovery with cross-note spread signals."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 sm:mb-4">
          <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
            {trendWindowLabel}
          </span>
          <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
            {domainsFreshness}
          </span>
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-indigo-300">
            Cross-note spread rank
          </span>
        </div>
        {homeDomains.length > 0 ? (
          <DomainsList domains={homeDomains.slice(0, 12)} ranked searchable />
        ) : errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : (
          <EmptyState
            title="Domain ranking is sparse"
            message="No ranked domain activity was returned for the active window."
          />
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-300">
          <Link href="/trending/domains" className="hover:text-indigo-200">
            Open trend view
          </Link>
          <span className="text-zinc-600">•</span>
          <Link href="/search?tab=all" className="hover:text-indigo-200">
            Search linked notes
          </Link>
        </div>
      </SectionCard>

      {discoverySnippetGroups.length > 0 ? (
        <SectionCard
          title="Current discovery windows"
          description="Representative snippets surfaced by hashtag, domain, and home discovery outputs."
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
        title="Explorer jump points"
        description="Open high-signal routes directly from the current discovery surface."
      >
        <QuickEntryGrid links={quickLinks} leadingSignals={leadingSignals} />
      </SectionCard>
    </div>
  );
}
