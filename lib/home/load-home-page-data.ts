import {
  getDiscoveryHome,
  getNetworkStats,
  getRelayStats,
  getRisingProfiles,
  getStatsSeries,
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
  normalizeSeriesPoints,
} from "@/lib/api/endpoints";
import type { SeriesPoint } from "@/components/charts/sparkline";
import { isApiTimeoutError } from "@/lib/api/http";
import { normalizeTopLanguages } from "@/lib/api/normalize";
import { fetchProfilesByPubkey, mergeHydratedProfile } from "@/lib/api/profile-hydration";
import { extractRelayRows, pickTopPrimitiveStats } from "@/components/explorer/stats-utils";
import { isRecord } from "@/components/explorer/utils";
import { summarizeLoadErrors, toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { readLanguage } from "@/lib/search-params/language";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import {
  NETWORK_PULSE_TILE_LIMIT,
  networkPulsePreferredKeys,
  readStatsWindow,
  type StatsWindow,
} from "@/lib/search-params/window";
import { traceHomeFanOut } from "@/lib/telemetry/trace";
import type {
  DomainEntry,
  EventRecord,
  HashtagEntry,
  Profile,
  TopLanguages,
} from "@/lib/types/api";

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

type PulseStat = { label: string; value: string | number | boolean; series?: SeriesPoint[] };

/**
 * Pair Pulse tiles with their history series and keep the strip honest: once
 * any tile has a trend, tiles without one are dropped rather than rendered
 * with a "No trend yet" placeholder (a half-empty strip reads weaker than a
 * shorter complete one). If fewer than two tiles would remain, nothing is
 * dropped so the strip never collapses to a single number.
 */
export function attachPulseSeries(
  stats: PulseStat[],
  series: { noteVolume: SeriesPoint[]; activeAuthors: SeriesPoint[]; relayEvents: SeriesPoint[] }
): PulseStat[] {
  const withSeries = stats.map((stat) => {
    const label = stat.label.toLowerCase();
    if (/(^|_)note_volume(_|$)/.test(label) || /(^|_)notes?(_|$)/.test(label)) {
      return { ...stat, series: series.noteVolume };
    }
    if (/(^|_)active_authors(_|$)/.test(label)) {
      return { ...stat, series: series.activeAuthors };
    }
    if (/(^|_)event_volume(_|$)/.test(label) || /(^|_)relay_events(_|$)/.test(label)) {
      return { ...stat, series: series.relayEvents };
    }
    return stat;
  });
  const hasTrend = (stat: PulseStat) => Boolean(stat.series && stat.series.length >= 2);
  if (!withSeries.some(hasTrend)) return withSeries;
  const trending = withSeries.filter(hasTrend);
  return trending.length >= 2 ? trending : withSeries;
}

export type HomeSectionFailures = {
  notes: boolean;
  profiles: boolean;
  risingProfiles: boolean;
  hashtags: boolean;
  domains: boolean;
};

export type HomePageData = {
  window: StatsWindow;
  language?: string;
  topLanguages?: TopLanguages;
  currentSearchParams: URLSearchParams;
  errorMessage: string;
  homeTimedOut: boolean;
  homeNotes: EventRecord[];
  hydratedHomeProfiles: Profile[];
  hydratedHomeRisingProfiles: Profile[];
  homeHashtags: HashtagEntry[];
  homeDomains: DomainEntry[];
  noteAuthorsByPubkey: Record<string, Profile>;
  pulseStats: PulseStat[];
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
  const lang = readLanguage(resolvedSearchParams);
  const scopedQuery = lang ? { window, lang } : { window };
  const failedMessages: string[] = [];
  let upstreamCallCount = 0;
  let homeTimedOut = false;
  const sectionFailures: HomeSectionFailures = {
    notes: false,
    profiles: false,
    risingProfiles: false,
    hashtags: false,
    domains: false,
  };

  let payload: Awaited<ReturnType<typeof getDiscoveryHome>> | null = null;
  let homeNotes: EventRecord[] = [];
  let homeProfiles: Profile[] = [];
  let homeRisingProfiles: Profile[] = [];
  let homeHashtags: HashtagEntry[] = [];
  let homeDomains: DomainEntry[] = [];
  let networkStats: Awaited<ReturnType<typeof getNetworkStats>> | null = null;
  let relayStats: Awaited<ReturnType<typeof getRelayStats>> | null = null;

  upstreamCallCount += 3;

  const stageOne = await Promise.allSettled([
    getDiscoveryHome("shortTtl", scopedQuery),
    getNetworkStats("shortTtl"),
    getRelayStats("shortTtl", window),
    getStatsSeries("note_volume", "7d", "shortTtl"),
    getStatsSeries("active_authors", "7d", "shortTtl"),
    getStatsSeries("relay_events", "7d", "shortTtl"),
  ]);
  upstreamCallCount += 3;

  const [
    homeResult,
    networkResult,
    relayResult,
    noteVolumeSeriesResult,
    activeAuthorsSeriesResult,
    relayEventsSeriesResult,
  ] = stageOne;

  if (homeResult.status === "fulfilled") {
    payload = homeResult.value;
    homeNotes = payload.notes ?? [];
    homeProfiles = payload.profiles ?? [];
    homeRisingProfiles = payload.rising_profiles ?? [];
    homeHashtags = payload.hashtags ?? [];
    homeDomains = payload.domains ?? [];
  } else {
    homeTimedOut = isApiTimeoutError(homeResult.reason);
    sectionFailures.notes = true;
    sectionFailures.profiles = true;
    sectionFailures.risingProfiles = true;
    sectionFailures.hashtags = true;
    sectionFailures.domains = true;
    failedMessages.push(
      toUserFacingErrorMessage(homeResult.reason, "Failed to load discovery home payload.")
    );
  }

  // Backward-compatible empty-section fallbacks for older home bundles.
  if (!homeTimedOut) {
    const fallbackRequests: Array<{
      key: "notes" | "profiles" | "risingProfiles" | "hashtags" | "domains";
      promise: Promise<unknown>;
    }> = [];
    if (homeNotes.length === 0) {
      fallbackRequests.push({
        key: "notes",
        promise: getTrendingNotes("shortTtl", scopedQuery),
      });
    }
    if (homeProfiles.length === 0) {
      fallbackRequests.push({
        key: "profiles",
        promise: getTrendingProfiles("shortTtl", scopedQuery),
      });
    }
    if (homeRisingProfiles.length === 0) {
      fallbackRequests.push({
        key: "risingProfiles",
        promise: getRisingProfiles("shortTtl", scopedQuery),
      });
    }
    if (homeHashtags.length === 0) {
      fallbackRequests.push({
        key: "hashtags",
        promise: getTrendingHashtags("shortTtl", scopedQuery),
      });
    }
    if (homeDomains.length === 0) {
      fallbackRequests.push({
        key: "domains",
        promise: getTrendingDomains("shortTtl", scopedQuery),
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
        if (entry.key === "risingProfiles")
          homeRisingProfiles = (value.profiles as Profile[] | undefined) ?? [];
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
  let hydratedHomeRisingProfiles = homeRisingProfiles;
  const notePreviewPubkeys = homeNotes
    .slice(0, 5)
    .map((note) => note.pubkey)
    .filter((pubkey): pubkey is string => typeof pubkey === "string" && pubkey.length > 0);
  const profilePreviewPubkeys = homeProfiles
    .slice(0, 5)
    .filter((profile) => !hasRichIdentity(profile))
    .map((profile) => profile.pubkey)
    .filter((pubkey): pubkey is string => typeof pubkey === "string" && pubkey.length > 0);
  const risingProfilePreviewPubkeys = homeRisingProfiles
    .slice(0, 5)
    .filter((profile) => !hasRichIdentity(profile))
    .map((profile) => profile.pubkey)
    .filter((pubkey): pubkey is string => typeof pubkey === "string" && pubkey.length > 0);
  const pubkeysToHydrate = Array.from(
    new Set(
      [...notePreviewPubkeys, ...profilePreviewPubkeys, ...risingProfilePreviewPubkeys].map(
        (pubkey) => pubkey.toLowerCase()
      )
    )
  );

  if (pubkeysToHydrate.length > 0) {
    upstreamCallCount += 1;
    try {
      noteAuthorsByPubkey = await fetchProfilesByPubkey(pubkeysToHydrate, "shortTtl");
      const hydrateProfile = (profile: Profile) => {
        const key = typeof profile.pubkey === "string" ? profile.pubkey.toLowerCase() : "";
        return mergeHydratedProfile(profile, key ? noteAuthorsByPubkey[key] : undefined);
      };
      hydratedHomeProfiles = homeProfiles.map(hydrateProfile);
      hydratedHomeRisingProfiles = homeRisingProfiles.map(hydrateProfile);
    } catch {
      noteAuthorsByPubkey = {};
      hydratedHomeProfiles = homeProfiles;
      hydratedHomeRisingProfiles = homeRisingProfiles;
    }
  }

  const sections = asRecord(payload?.sections);
  const networkSummary = asRecord(sections?.network_summary);
  const homeStats = isRecord(payload?.stats) ? payload.stats : {};
  // Unscoped network stats would overwrite language-scoped note volume and
  // active authors. Relay stats stay on the unscoped call below.
  const pulseSource =
    lang && networkSummary
      ? {
          ...homeStats,
          activity: asRecord(networkSummary.activity) ?? undefined,
          relays: asRecord(networkSummary.relays) ?? undefined,
        }
      : { ...homeStats, ...(networkStats ?? {}) };
  const basePulseStats = pickTopPrimitiveStats(
    pulseSource,
    networkPulsePreferredKeys(window),
    NETWORK_PULSE_TILE_LIMIT,
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
  const relayEventsSeries =
    relayEventsSeriesResult.status === "fulfilled"
      ? normalizeSeriesPoints(relayEventsSeriesResult.value)
      : [];
  // Attach each history series to its own metric only; a tile must never
  // borrow another metric's trend.
  const pulseStats = attachPulseSeries(basePulseStats, {
    noteVolume: lang ? [] : noteVolumeSeries,
    activeAuthors: lang ? [] : activeAuthorsSeries,
    relayEvents: relayEventsSeries,
  });
  let relayLeaders = extractRelayRows(networkSummary ?? payload, 1, window);
  if (relayLeaders.length === 0) {
    relayLeaders = extractRelayRows(relayStats, 1, window);
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
    language: lang,
    topLanguages:
      normalizeTopLanguages(payload?.top_languages) ??
      normalizeTopLanguages(networkSummary?.top_languages),
    currentSearchParams,
    errorMessage: summarizeLoadErrors(failedMessages) ?? "",
    homeTimedOut,
    homeNotes,
    hydratedHomeProfiles,
    hydratedHomeRisingProfiles,
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
