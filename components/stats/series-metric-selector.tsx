"use client";

import { useRouter } from "next/navigation";

import {
  DEFAULT_STATS_SERIES_METRIC,
  STATS_SERIES_METRIC_LABELS,
  STATS_SERIES_METRICS,
  type StatsSeriesMetric,
} from "@/lib/stats/series-metrics";

export function SeriesMetricSelector({
  path,
  searchParams,
  active,
}: {
  path: string;
  /** Current query string. A URLSearchParams instance cannot cross to the client. */
  searchParams: string;
  active: StatsSeriesMetric;
}) {
  const router = useRouter();
  return (
    <label className="text-ink-muted inline-flex items-center gap-2 text-sm">
      <span>Series</span>
      <select
        aria-label="Series metric"
        value={active}
        className="border-edge-strong bg-surface text-ink rounded-md border px-2 py-1 text-sm"
        onChange={(event) => {
          const metric = event.target.value;
          router.push(seriesMetricHref(path, searchParams, metric as StatsSeriesMetric));
        }}
      >
        {STATS_SERIES_METRICS.map((metric) => (
          <option key={metric} value={metric}>
            {STATS_SERIES_METRIC_LABELS[metric]}
          </option>
        ))}
      </select>
    </label>
  );
}

function seriesMetricHref(path: string, current: string, metric: StatsSeriesMetric): string {
  const next = new URLSearchParams(current);
  if (metric === DEFAULT_STATS_SERIES_METRIC) next.delete("series");
  else next.set("series", metric);
  next.delete("cursor");
  next.delete("health_cursor");
  next.delete("offset");
  const query = next.toString();
  return query.length > 0 ? `${path}?${query}` : path;
}
