import type { SeriesPoint } from "@/components/charts/sparkline";
import type { ZapDayStat, ZapHistogramKey } from "@/lib/types/api";
import { ZAP_HISTOGRAM_KEYS } from "@/lib/types/api";

export const UNATTRIBUTED_CLIENT = "(none)";

export const ZAP_HISTOGRAM_LABELS: Record<ZapHistogramKey, string> = {
  lt21: "Under 21 sats",
  "21_100": "21–100 sats",
  "101_1k": "101–1,000 sats",
  "1k_10k": "1,000–10,000 sats",
  "10k_100k": "10,000–100,000 sats",
  gt100k: "Over 100,000 sats",
};

export function clientLabel(client: string): string {
  return client === UNATTRIBUTED_CLIENT ? "Unattributed" : client;
}

/** Shares on the stats payloads are fractions from 0 to 1. */
export function formatUnitShare(value: number): string {
  const percent = value * 100;
  const digits = percent > 0 && percent < 10 ? 2 : 0;
  return `${percent.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

/** `bridged_share_bps` is integer basis points. 100 bps is 1 percent. */
export function formatBasisPointsAsPercent(bps: number): string {
  const percent = bps / 100;
  return `${percent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

export function formatLatencyMs(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} s`;
  }
  return `${Math.round(value).toLocaleString()} ms`;
}

export function formatRate(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function dailyCountPoints<T extends { day: string }>(
  rows: ReadonlyArray<T>,
  read: (row: T) => number | undefined
): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const row of rows) {
    const value = read(row);
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const timestamp = Date.parse(`${row.day}T00:00:00.000Z`);
    if (!Number.isFinite(timestamp)) continue;
    points.push({ t: Math.floor(timestamp / 1000), v: value });
  }
  return points;
}

export function sumOptional(values: Array<number | undefined>): number | null {
  const present = values.filter((value): value is number => typeof value === "number");
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0);
}

export function summedHistogram(
  series: ReadonlyArray<ZapDayStat>
): Array<{ key: ZapHistogramKey; count: number }> {
  const seen = new Map<ZapHistogramKey, number>();
  for (const day of series) {
    if (!day.histogram) continue;
    for (const key of ZAP_HISTOGRAM_KEYS) {
      const value = day.histogram[key];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      seen.set(key, (seen.get(key) ?? 0) + value);
    }
  }
  return ZAP_HISTOGRAM_KEYS.flatMap((key) => {
    if (!seen.has(key)) return [];
    return [{ key, count: seen.get(key) ?? 0 }];
  });
}
