import { BarChart } from "@/components/charts/bar-chart";
import type { SeriesPoint } from "@/components/charts/sparkline";
import { EmptyState } from "@/components/explorer/empty-state";
import { SERIES_EMPTY_MESSAGE } from "@/lib/stats/surface-display";

function dayLabel(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

/**
 * A daily series needs three points before it becomes a bar chart.
 * One or two points stay as numbers so a single gray bar never fills the row.
 */
export function BarSeries({
  points,
  label,
  empty = SERIES_EMPTY_MESSAGE,
}: {
  points: SeriesPoint[];
  label: string;
  empty?: string;
}) {
  if (points.length === 0) return <EmptyState message={empty} />;
  if (points.length < 3) {
    const first = points[0]!;
    return (
      <div>
        <p className="text-ink-faint text-xs">{label}</p>
        <p className="text-ink mt-1 text-sm tabular-nums">
          {points.map((point) => point.v.toLocaleString()).join(" · ")}
        </p>
        <p className="text-ink-muted mt-1 text-xs">
          Collecting daily data since {dayLabel(first.t)}
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-ink-faint mb-2 text-xs">{label}</p>
      <BarChart points={points} label={label} />
    </div>
  );
}
