import type { SeriesPoint } from "@/components/charts/sparkline";

/** Pure-SVG bar chart for stats pages. */
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

  const max = Math.max(...points.map((p) => p.v), 1);
  const pad = 8;
  const barGap = 2;
  const usableWidth = width - pad * 2;
  const barWidth = Math.max(1, usableWidth / points.length - barGap);
  const usableHeight = height - pad * 2;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={label ?? "Bar chart"}
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
            <title>
              {new Date(point.t * 1000).toISOString()} — {point.v}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}
