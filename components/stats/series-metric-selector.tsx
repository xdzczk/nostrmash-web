import Link from "@/components/app-link";

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
  searchParams: URLSearchParams;
  active: StatsSeriesMetric;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Series metric">
      {STATS_SERIES_METRICS.map((metric) => {
        const isActive = metric === active;
        return (
          <Link
            key={metric}
            href={seriesMetricHref(path, searchParams, metric)}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              isActive ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {STATS_SERIES_METRIC_LABELS[metric]}
          </Link>
        );
      })}
    </div>
  );
}

function seriesMetricHref(
  path: string,
  current: URLSearchParams,
  metric: StatsSeriesMetric
): string {
  const next = new URLSearchParams(current);
  if (metric === DEFAULT_STATS_SERIES_METRIC) next.delete("series");
  else next.set("series", metric);
  next.delete("cursor");
  next.delete("health_cursor");
  next.delete("offset");
  const query = next.toString();
  return query.length > 0 ? `${path}?${query}` : path;
}
