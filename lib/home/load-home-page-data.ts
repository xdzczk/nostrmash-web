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
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
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

  let payload: Awaited<ReturnType<typeof getDiscoveryHome>> | null = null;
  let homeNotes: EventRecord[] = [];
  let homeProfiles: Profile[] = [];
  let homeHashtags: HashtagEntry[] = [];
  let homeDomains: DomainEntry[] = [];
  let networkStats: Awaited<ReturnType<typeof getNetworkStats>> | null = null;
  let relayStats: Awaited<ReturnType<typeof getRelayStats>> | null = null;

  const needsWindowedTrends = window !== "24h";
  upstreamCallCount += needsWindowedTrends ? 7 : 3;

  const stageOne = await Promise.allSettled([
    getDiscoveryHome("shortTtl"),
    needsWindowedTrends
      ? getTrendingNotes("shortTtl", { window, limit: 20 })
      : Promise.resolve(null),
    needsWindowedTrends
      ? getTrendingProfiles("shortTtl", { window, limit: 20 })
      : Promise.resolve(null),
    needsWindowedTrends
      ? getTrendingHashtags("shortTtl", { window, limit: 20 })
      : Promise.resolve(null),
    needsWindowedTrends
      ? getTrendingDomains("shortTtl", { window, limit: 20 })
      : Promise.resolve(null),
    getNetworkStats("shortTtl"),
    getRelayStats("shortTtl"),
    getStatsSeries("note_volume", window === "7d" ? "7d" : "7d", "shortTtl"),
    getStatsSeries("active_authors", "7d", "shortTtl"),
  ]);
  upstreamCallCount += 2;

  const [
    homeResult,
    notesResult,
    profilesResult,
    hashtagsResult,
    domainsResult,
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
    failedMessages.push(
      toUserFacingErrorMessage(homeResult.reason, "Failed to load discovery home payload.")
    );
  }

  if (!homeTimedOut && needsWindowedTrends) {
    if (notesResult.status === "fulfilled" && notesResult.value) {
      homeNotes = notesResult.value.notes ?? homeNotes;
    } else if (notesResult.status === "rejected") {
      failedMessages.push(
        toUserFacingErrorMessage(notesResult.reason, "Failed to load windowed trends.")
      );
    }
    if (profilesResult.status === "fulfilled" && profilesResult.value) {
      homeProfiles = profilesResult.value.profiles ?? homeProfiles;
    } else if (profilesResult.status === "rejected") {
      failedMessages.push(
        toUserFacingErrorMessage(profilesResult.reason, "Failed to load windowed trends.")
      );
    }
    if (hashtagsResult.status === "fulfilled" && hashtagsResult.value) {
      homeHashtags = hashtagsResult.value.hashtags ?? homeHashtags;
    } else if (hashtagsResult.status === "rejected") {
      failedMessages.push(
        toUserFacingErrorMessage(hashtagsResult.reason, "Failed to load windowed trends.")
      );
    }
    if (domainsResult.status === "fulfilled" && domainsResult.value) {
      homeDomains = domainsResult.value.domains ?? homeDomains;
    } else if (domainsResult.status === "rejected") {
      failedMessages.push(
        toUserFacingErrorMessage(domainsResult.reason, "Failed to load windowed trends.")
      );
    }
  }

  // 24h empty-home fallbacks: only fetch missing surfaces.
  if (!homeTimedOut && window === "24h") {
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
          failedMessages.push(
            toUserFacingErrorMessage(result.reason, `Failed to load trending ${entry.key}.`)
          );
          continue;
        }
        const value = result.value as Record<string, unknown>;
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

  const computedAt =
    (noteVolumeSeriesResult.status === "fulfilled" &&
      typeof noteVolumeSeriesResult.value.computed_at === "string" &&
      noteVolumeSeriesResult.value.computed_at) ||
    (isRecord(networkStats) &&
      typeof (networkStats as Record<string, unknown>).computed_at === "string" &&
      ((networkStats as Record<string, unknown>).computed_at as string)) ||
    (isRecord(payload) &&
      typeof (payload as Record<string, unknown>).computed_at === "string" &&
      ((payload as Record<string, unknown>).computed_at as string)) ||
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
    errorMessage: failedMessages.length > 0 ? failedMessages.join(" | ") : "",
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
  };
}
