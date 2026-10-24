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

/**
 * Keep points whose timestamp falls inside `hours` of the newest point.
 * The series endpoint publishes 7-day and 30-day history, so a 24-hour view
 * is this slice rather than a separate request.
 */
export function sliceSeriesToHours(
  points: Array<{ t: number; v: number }>,
  hours: number
): Array<{ t: number; v: number }> {
  if (points.length === 0 || !Number.isFinite(hours) || hours <= 0) return points;
  const latest = points.reduce((max, point) => Math.max(max, point.t), 0);
  const toMs = (value: number) => (value < 1e12 ? value * 1000 : value);
  const cutoff = toMs(latest) - hours * 60 * 60 * 1000;
  const sliced = points.filter((point) => toMs(point.t) >= cutoff);
  return sliced.length > 0 ? sliced : points;
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
