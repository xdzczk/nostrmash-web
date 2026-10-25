import type { SeriesPoint } from "@/components/charts/sparkline";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatSeriesTick(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  const hour = String(date.getUTCHours()).padStart(2, "0");
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${hour}:00 UTC`;
}

/** Pure-SVG bar chart for stats pages. Peak and the time span are visible, not only in a tooltip. */
export function BarChart({
  points,
  width = 480,
  height = 160,
  className = "",
  label,
}: {
  points: SeriesPoint[];
  width?: number;
  height?: number;
  className?: string;
  label?: string;
}) {
  if (points.length === 0) {
    return (
      <div className={`text-ink-faint text-sm ${className}`}>
        No historical points yet — charts fill in as snapshot history accumulates.
      </div>
    );
  }

  const max = Math.max(...points.map((point) => point.v), 1);
  const latest = points[points.length - 1]!;
  const first = points[0]!;
  const pad = 8;
  const barGap = 2;
  const usableWidth = width - pad * 2;
  const barWidth = Math.max(1, usableWidth / points.length - barGap);
  const usableHeight = height - pad * 2;
  const chartLabel = label ?? "Bar chart";

  return (
    <figure className={className}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={chartLabel}
      >
        {points.map((point, index) => {
          const barHeight = (point.v / max) * usableHeight;
          const x = pad + index * (barWidth + barGap);
          const y = height - pad - barHeight;
          return (
            <rect
              key={`${point.t}-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(1, barHeight)}
              rx={1.5}
              className="fill-accent/70"
            >
              <title>{`${formatSeriesTick(point.t)} — ${point.v.toLocaleString()}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="text-ink-faint mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px]">
        <span>{formatSeriesTick(first.t)}</span>
        <span>Peak {max.toLocaleString()}</span>
        <span>
          {formatSeriesTick(latest.t)} · {latest.v.toLocaleString()}
        </span>
      </figcaption>
    </figure>
  );
}
