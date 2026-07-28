import type { StatsResponse } from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import type { CacheClass } from "@/lib/caching/policies";
import { nativeApiV1Routes } from "@/lib/api/endpoints/shared";

export type StatsSeriesMetric = "note_volume" | "active_authors" | "relay_events";
export type StatsSeriesWindow = "7d" | "30d";

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

export async function getRelayStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>(nativeApiV1Routes.relayStats, { cacheClass });
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
