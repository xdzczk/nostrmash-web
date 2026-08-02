import {
  getDiscoveryHome,
  getNetworkStats,
  getRelayStats,
  getStatsSeries,
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
  normalizeSeriesPoints,
} from "@/lib/api/endpoints";
import type { SeriesPoint } from "@/components/charts/sparkline";
import { isApiTimeoutError } from "@/lib/api/http";
import { fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { extractRelayRows, pickTopPrimitiveStats } from "@/components/explorer/stats-utils";
import { isRecord } from "@/components/explorer/utils";
import { summarizeLoadErrors, toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import {
  networkPulsePreferredKeys,
  readStatsWindow,
  type StatsWindow,
} from "@/lib/search-params/window";
import { traceHomeFanOut } from "@/lib/telemetry/trace";
import type { DomainEntry, EventRecord, HashtagEntry, Profile } from "@/lib/types/api";

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function hasRichIdentity(profile: Profile | undefined): boolean {
  if (!profile) return false;
  const displayName = typeof profile.display_name === "string" ? profile.display_name.trim() : "";
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  const picture = typeof profile.picture === "string" ? profile.picture.trim() : "";
  return displayName.length > 0 || name.length > 0 || picture.length > 0;
}

export type HomeSectionFailures = {
  notes: boolean;
  profiles: boolean;
  hashtags: boolean;
  domains: boolean;
};

export type HomePageData = {
  window: StatsWindow;
  currentSearchParams: URLSearchParams;
  errorMessage: string;
  homeTimedOut: boolean;
  homeNotes: EventRecord[];
  hydratedHomeProfiles: Profile[];
  homeHashtags: HashtagEntry[];
  homeDomains: DomainEntry[];
  noteAuthorsByPubkey: Record<string, Profile>;
  pulseStats: Array<{ label: string; value: string | number | boolean; series?: SeriesPoint[] }>;
  relayLeaders: ReturnType<typeof extractRelayRows>;
  upstreamCallCount: number;
  computedAt?: string | null;
  sectionFailures: HomeSectionFailures;
};

/**
 * Homepage data orchestration collapsed into two stages:
 * 1) discovery + windowed trends + network/relay stats in parallel
 * 2) profile hydration for preview cards
 */
export async function loadHomePageData(
  resolvedSearchParams: Record<string, string | string[] | undefined>
): Promise<HomePageData> {
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const window = readStatsWindow(resolvedSearchParams);
  const failedMessages: string[] = [];
  let upstreamCallCount = 0;
  let homeTimedOut = false;
  const sectionFailures: HomeSectionFailures = {
    notes: false,
    profiles: false,
    hashtags: false,
    domains: false,
  };

  let payload: Awaited<ReturnType<typeof getDiscoveryHome>> | null = null;
  let homeNotes: EventRecord[] = [];
  let homeProfiles: Profile[] = [];
  let homeHashtags: HashtagEntry[] = [];
  let homeDomains: DomainEntry[] = [];
  let networkStats: Awaited<ReturnType<typeof getNetworkStats>> | null = null;
  let relayStats: Awaited<ReturnType<typeof getRelayStats>> | null = null;

  upstreamCallCount += 3;

  const stageOne = await Promise.allSettled([
    getDiscoveryHome("shortTtl", { window }),
    getNetworkStats("shortTtl"),
    getRelayStats("shortTtl"),
    getStatsSeries("note_volume", window === "7d" ? "7d" : "7d", "shortTtl"),
    getStatsSeries("active_authors", "7d", "shortTtl"),
  ]);
  upstreamCallCount += 2;

  const [
    homeResult,
    networkResult,
    relayResult,
    noteVolumeSeriesResult,
    activeAuthorsSeriesResult,
  ] = stageOne;

  if (homeResult.status === "fulfilled") {
    payload = homeResult.value;
    homeNotes = payload.notes ?? [];
    homeProfiles = payload.profiles ?? [];
    homeHashtags = payload.hashtags ?? [];
    homeDomains = payload.domains ?? [];
  } else {
    homeTimedOut = isApiTimeoutError(homeResult.reason);
    sectionFailures.notes = true;
    sectionFailures.profiles = true;
    sectionFailures.hashtags = true;
    sectionFailures.domains = true;
    failedMessages.push(
      toUserFacingErrorMessage(homeResult.reason, "Failed to load discovery home payload.")
    );
  }

  // Backward-compatible empty-section fallbacks for older home bundles.
  if (!homeTimedOut) {
    const fallbackRequests: Array<{
      key: "notes" | "profiles" | "hashtags" | "domains";
      promise: Promise<unknown>;
    }> = [];
    if (homeNotes.length === 0) {
      fallbackRequests.push({
        key: "notes",
        promise: getTrendingNotes("shortTtl", { window }),
      });
    }
    if (homeProfiles.length === 0) {
      fallbackRequests.push({
        key: "profiles",
        promise: getTrendingProfiles("shortTtl", { window }),
      });
    }
    if (homeHashtags.length === 0) {
      fallbackRequests.push({
        key: "hashtags",
        promise: getTrendingHashtags("shortTtl", { window }),
      });
    }
    if (homeDomains.length === 0) {
      fallbackRequests.push({
        key: "domains",
        promise: getTrendingDomains("shortTtl", { window }),
      });
    }
    if (fallbackRequests.length > 0) {
      upstreamCallCount += fallbackRequests.length;
      const fallbackResults = await Promise.allSettled(
        fallbackRequests.map((entry) => entry.promise)
      );
      for (let index = 0; index < fallbackRequests.length; index += 1) {
        const entry = fallbackRequests[index]!;
        const result = fallbackResults[index]!;
        if (result.status !== "fulfilled") {
          sectionFailures[entry.key] = true;
          failedMessages.push(
            toUserFacingErrorMessage(result.reason, `Failed to load trending ${entry.key}.`)
          );
          continue;
        }
        const value = result.value as Record<string, unknown>;
        sectionFailures[entry.key] = false;
        if (entry.key === "notes") homeNotes = (value.notes as EventRecord[] | undefined) ?? [];
        if (entry.key === "profiles")
          homeProfiles = (value.profiles as Profile[] | undefined) ?? [];
        if (entry.key === "hashtags")
          homeHashtags = (value.hashtags as HashtagEntry[] | undefined) ?? [];
        if (entry.key === "domains")
          homeDomains = (value.domains as DomainEntry[] | undefined) ?? [];
      }
    }
  }

  if (networkResult.status === "fulfilled") {
    networkStats = networkResult.value;
  } else {
    failedMessages.push(
      toUserFacingErrorMessage(networkResult.reason, "Failed to load network fallback.")
    );
  }
  if (relayResult.status === "fulfilled") {
    relayStats = relayResult.value;
  } else {
    failedMessages.push(
      toUserFacingErrorMessage(relayResult.reason, "Failed to load network fallback.")
    );
  }

  let noteAuthorsByPubkey: Record<string, Profile> = {};
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
    upstreamCallCount += 1;
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
  const basePulseStats = pickTopPrimitiveStats(
    { ...homeStats, ...(networkStats ?? {}) },
    networkPulsePreferredKeys(window),
    6,
    window
  );
  const noteVolumeSeries =
    noteVolumeSeriesResult.status === "fulfilled"
      ? normalizeSeriesPoints(noteVolumeSeriesResult.value)
      : [];
  const activeAuthorsSeries =
    activeAuthorsSeriesResult.status === "fulfilled"
      ? normalizeSeriesPoints(activeAuthorsSeriesResult.value)
      : [];
  const pulseStats = basePulseStats.map((stat) => {
    const label = stat.label.toLowerCase();
    if (label.includes("note") || label.includes("volume") || label.includes("event")) {
      return { ...stat, series: noteVolumeSeries };
    }
    if (label.includes("author") || label.includes("profile")) {
      return { ...stat, series: activeAuthorsSeries };
    }
    return stat;
  });
  let relayLeaders = extractRelayRows(networkSummary ?? payload, 1);
  if (relayLeaders.length === 0) {
    relayLeaders = extractRelayRows(relayStats, 1);
  }

  // Prefer discovery/home computed_at: that tracks the live homepage
  // snapshots (refreshed every few minutes). Do NOT prefer stats/series
  // computed_at — that comes from hourly stats_snapshot_history rows
  // (ON CONFLICT DO NOTHING within the hour), so it can look ~50m stale
  // even when the homepage itself is fresh.
  const computedAt =
    (isRecord(payload) &&
      typeof (payload as Record<string, unknown>).computed_at === "string" &&
      ((payload as Record<string, unknown>).computed_at as string)) ||
    (isRecord(networkStats) &&
      typeof (networkStats as Record<string, unknown>).computed_at === "string" &&
      ((networkStats as Record<string, unknown>).computed_at as string)) ||
    null;

  traceHomeFanOut(upstreamCallCount, {
    window: window === "7d" ? 7 : 1,
    homeTimedOut: homeTimedOut ? 1 : 0,
    hydratedPubkeys: pubkeysToHydrate.length,
    failedMessages: failedMessages.length,
  });

  return {
    window,
    currentSearchParams,
    errorMessage: summarizeLoadErrors(failedMessages) ?? "",
    homeTimedOut,
    homeNotes,
    hydratedHomeProfiles,
    homeHashtags,
    homeDomains,
    noteAuthorsByPubkey,
    pulseStats,
    relayLeaders,
    upstreamCallCount,
    computedAt,
    sectionFailures,
  };
}
