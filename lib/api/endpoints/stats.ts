import type {
  AccountStatsResponse,
  ClientStatsResponse,
  IdentityStatsResponse,
  StatsResponse,
  ZapStatsResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import {
  normalizeAccountStats,
  normalizeClientStats,
  normalizeIdentityStats,
  normalizeZapStats,
} from "@/lib/api/normalize/ecosystem";
import {
  accountStatsSchema,
  clientStatsSchema,
  identityStatsSchema,
  zapStatsSchema,
} from "@/lib/api/schemas/ecosystem";
import type { CacheClass } from "@/lib/caching/policies";
import { nativeApiV1Routes } from "@/lib/api/endpoints/shared";
import { relayStatsWindow, type StatsWindow } from "@/lib/search-params/window";
import type { StatsSeriesMetric } from "@/lib/stats/series-metrics";

export type { StatsSeriesMetric } from "@/lib/stats/series-metrics";
export {
  DEFAULT_STATS_SERIES_METRIC,
  STATS_SERIES_METRIC_LABELS,
  STATS_SERIES_METRICS,
  isStatsSeriesMetric,
  parseStatsSeriesMetric,
} from "@/lib/stats/series-metrics";

export type StatsSeriesWindow = "24h" | "7d" | "30d";

export type StatsSeriesResponse = {
  metric?: StatsSeriesMetric | string;
  window?: StatsSeriesWindow | string;
  computed_at?: string;
  points?: Array<{ t?: number; v?: number }>;
  consistency?: string;
};

export async function getNetworkStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>(nativeApiV1Routes.networkStats, { cacheClass });
}

export async function getContentStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>(nativeApiV1Routes.contentStats, { cacheClass });
}

export async function getRelayStats(cacheClass: CacheClass = "shortTtl", window?: StatsWindow) {
  const relayWindow = window ? relayStatsWindow(window) : undefined;
  return fetchApiJson<StatsResponse>(nativeApiV1Routes.relayStats, {
    cacheClass,
    query: relayWindow ? { window: relayWindow } : undefined,
  });
}

export async function getStatsSeries(
  metric: StatsSeriesMetric,
  window: StatsSeriesWindow = "7d",
  cacheClass: CacheClass = "shortTtl"
) {
  return fetchApiJson<StatsSeriesResponse>(nativeApiV1Routes.statsSeries, {
    cacheClass,
    query: { metric, window },
  });
}

function windowQuery(window?: StatsWindow): { window: StatsWindow } | undefined {
  return window ? { window } : undefined;
}

export async function getClientStats(
  cacheClass: CacheClass = "shortTtl",
  window?: StatsWindow
): Promise<ClientStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.clientStats, {
    cacheClass,
    query: windowQuery(window),
    schema: clientStatsSchema,
  });
  return normalizeClientStats(response);
}

export async function getIdentityStats(
  cacheClass: CacheClass = "shortTtl"
): Promise<IdentityStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.identityStats, {
    cacheClass,
    schema: identityStatsSchema,
  });
  return normalizeIdentityStats(response);
}

export async function getZapStats(
  cacheClass: CacheClass = "shortTtl",
  window?: StatsWindow
): Promise<ZapStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.zapStats, {
    cacheClass,
    query: windowQuery(window),
    schema: zapStatsSchema,
  });
  return normalizeZapStats(response);
}

export async function getAccountStats(
  cacheClass: CacheClass = "shortTtl"
): Promise<AccountStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.accountStats, {
    cacheClass,
    schema: accountStatsSchema,
  });
  return normalizeAccountStats(response);
}

export function normalizeSeriesPoints(
  response: StatsSeriesResponse | null | undefined
): Array<{ t: number; v: number }> {
  if (!response || !Array.isArray(response.points)) return [];
  return response.points
    .map((point) => ({
      t: typeof point.t === "number" ? point.t : Number.NaN,
      v: typeof point.v === "number" ? point.v : Number.NaN,
    }))
    .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.v));
}
