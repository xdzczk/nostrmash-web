import Link from "next/link";
import type { Metadata } from "next";

import { ConsistencyBadge } from "@/components/explorer/consistency-badge";
import { EmptyState } from "@/components/explorer/empty-state";
import { extractPrimitiveStats, isRecord } from "@/components/explorer/utils";
import { NetworkPulseStrip } from "@/components/home/network-pulse-strip";
import { QuickEntryGrid } from "@/components/home/quick-entry-grid";
import { SystemPosturePanel } from "@/components/home/system-posture-panel";
import { SearchForm } from "@/components/search/search-form";
import { NotesList, ProfilesList, HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { extractRelayRows } from "@/components/explorer/stats-utils";
import {
  getContentStats,
  getDiscoveryHome,
  getNetworkStats,
  getProfile,
  getProfilesBatch,
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
  const hasRichIdentity = (profile: Profile | undefined): boolean => {
    if (!profile) return false;
    const displayName = typeof profile.display_name === "string" ? profile.display_name.trim() : "";
    const name = typeof profile.name === "string" ? profile.name.trim() : "";
    const picture = typeof profile.picture === "string" ? profile.picture.trim() : "";
    return displayName.length > 0 || name.length > 0 || picture.length > 0;
  };

  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getDiscoveryHome>> | null = null;
  let networkStats: Awaited<ReturnType<typeof getNetworkStats>> | null = null;
  let contentStats: Awaited<ReturnType<typeof getContentStats>> | null = null;
  let relayStats: Awaited<ReturnType<typeof getRelayStats>> | null = null;
  let trendingNotes: Awaited<ReturnType<typeof getTrendingNotes>> | null = null;
  let trendingProfiles: Awaited<ReturnType<typeof getTrendingProfiles>> | null = null;
  let trendingHashtags: Awaited<ReturnType<typeof getTrendingHashtags>> | null = null;
  let noteAuthorsByPubkey: Record<string, Profile> = {};
  const primaryResults = await Promise.allSettled([
    getDiscoveryHome("shortTtl"),
    getNetworkStats("shortTtl"),
    getContentStats("shortTtl"),
    getRelayStats("shortTtl"),
  ]);
  const [homeResult, networkResult, contentResult, relayResult] = primaryResults;

  payload = homeResult.status === "fulfilled" ? homeResult.value : null;
  networkStats = networkResult.status === "fulfilled" ? networkResult.value : null;
  contentStats = contentResult.status === "fulfilled" ? contentResult.value : null;
  relayStats = relayResult.status === "fulfilled" ? relayResult.value : null;

  const failedMessages = primaryResults
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) =>
      result.reason instanceof Error ? result.reason.message : "Failed to load homepage data."
    );
  if (failedMessages.length > 0) {
    errorMessage = failedMessages.join(" | ");
  }

  let homeNotes = payload?.notes ?? [];
  let homeProfiles = payload?.profiles ?? [];
  let homeHashtags = payload?.hashtags ?? [];

  const needsNotesFallback = homeNotes.length === 0;
  const needsProfilesFallback = homeProfiles.length === 0;
  const needsHashtagsFallback = homeHashtags.length === 0;
  if (needsNotesFallback || needsProfilesFallback || needsHashtagsFallback) {
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
    if (failedMessages.length > 0) {
      errorMessage = failedMessages.join(" | ");
    }
  }

  let hydratedHomeProfiles = homeProfiles;

  if (homeNotes.length > 0) {
    try {
      const noteAuthors = await getProfilesBatch(
        homeNotes
          .slice(0, 5)
          .map((note) => note.pubkey)
          .filter((pubkey): pubkey is string => typeof pubkey === "string"),
        "shortTtl"
      );
      noteAuthorsByPubkey = Object.fromEntries(
        noteAuthors
          .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
          .map((profile) => [profile.pubkey.toLowerCase(), profile])
      );

      const authorPubkeysNeedingFallback = Array.from(
        new Set(
          homeNotes
            .slice(0, 5)
            .map((note) => (typeof note.pubkey === "string" ? note.pubkey.toLowerCase() : ""))
            .filter((pubkey) => pubkey.length > 0)
            .filter((pubkey) => !hasRichIdentity(noteAuthorsByPubkey[pubkey]))
        )
      );
      if (authorPubkeysNeedingFallback.length > 0) {
        const fallbackProfiles = await Promise.allSettled(
          authorPubkeysNeedingFallback.map((pubkey) => getProfile(pubkey, "shortTtl"))
        );
        for (const result of fallbackProfiles) {
          if (
            result.status === "fulfilled" &&
            typeof result.value.pubkey === "string" &&
            result.value.pubkey.length > 0
          ) {
            noteAuthorsByPubkey[result.value.pubkey.toLowerCase()] = result.value;
          }
        }
      }
    } catch {
      noteAuthorsByPubkey = {};
    }
  }

  if (homeProfiles.length > 0) {
    try {
      const enrichedProfiles = await getProfilesBatch(
        homeProfiles
          .slice(0, 6)
          .map((profile) => profile.pubkey)
          .filter((pubkey): pubkey is string => typeof pubkey === "string" && pubkey.length > 0),
        "shortTtl"
      );
      const enrichedByPubkey = new Map(
        enrichedProfiles
          .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
          .map((profile) => [profile.pubkey.toLowerCase(), profile] as const)
      );
      hydratedHomeProfiles = homeProfiles.map((profile) => {
        const key = typeof profile.pubkey === "string" ? profile.pubkey.toLowerCase() : "";
        const enriched = key ? enrichedByPubkey.get(key) : undefined;
        return { ...profile, ...(enriched ?? {}) };
      });

      const profilesNeedingFallback = hydratedHomeProfiles
        .slice(0, 5)
        .map((profile) => (typeof profile.pubkey === "string" ? profile.pubkey.toLowerCase() : ""))
        .filter((pubkey) => pubkey.length > 0)
        .filter((pubkey, index, arr) => arr.indexOf(pubkey) === index)
        .filter((pubkey) => {
          const match = hydratedHomeProfiles.find(
            (profile) =>
              typeof profile.pubkey === "string" && profile.pubkey.toLowerCase() === pubkey
          );
          return !hasRichIdentity(match);
        });
      if (profilesNeedingFallback.length > 0) {
        const fallbackProfiles = await Promise.allSettled(
          profilesNeedingFallback.map((pubkey) => getProfile(pubkey, "shortTtl"))
        );
        const fallbackByPubkey = new Map<string, Profile>();
        for (const result of fallbackProfiles) {
          if (
            result.status === "fulfilled" &&
            typeof result.value.pubkey === "string" &&
            result.value.pubkey.length > 0
          ) {
            fallbackByPubkey.set(result.value.pubkey.toLowerCase(), result.value);
          }
        }
        hydratedHomeProfiles = hydratedHomeProfiles.map((profile) => {
          const key = typeof profile.pubkey === "string" ? profile.pubkey.toLowerCase() : "";
          const fallback = key ? fallbackByPubkey.get(key) : undefined;
          return { ...profile, ...(fallback ?? {}) };
        });
      }
    } catch {
      hydratedHomeProfiles = homeProfiles;
    }
  }

  const pulseStats = extractPrimitiveStats(isRecord(payload?.stats) ? payload.stats : {}, []).slice(
    0,
    4
  );
  const networkNowStats = [
    ...extractPrimitiveStats(isRecord(networkStats) ? networkStats : {}, []).slice(0, 2),
    ...extractPrimitiveStats(isRecord(contentStats) ? contentStats : {}, []).slice(0, 2),
    ...extractPrimitiveStats(isRecord(relayStats) ? relayStats : {}, []).slice(0, 2),
  ].slice(0, 6);
  const relayLeaders = extractRelayRows(relayStats, 1);
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

      <SectionCard
        title="Quick entry points"
        description="Navigate directly to high-signal explorer routes."
      >
        <QuickEntryGrid links={quickLinks} leadingSignals={leadingSignals} />
      </SectionCard>
    </div>
  );
}
