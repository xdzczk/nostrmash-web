import type { SeriesPoint } from "@/components/charts/sparkline";
import { rollingTotalDeltas } from "@/lib/stats/series-delta";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatSeriesTick(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  const hour = String(date.getUTCHours()).padStart(2, "0");
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${hour}:00 UTC`;
}

function formatSigned(value: number): string {
  const absolute = Math.abs(value).toLocaleString();
  if (value > 0) return `+${absolute}`;
  if (value < 0) return `−${absolute}`;
  return "0";
}

/**
 * Bars for the change between rolling totals. A zero line sits in the middle
 * so a rise and a fall are both readable.
 */
export function DeltaChart({
  points,
  label,
  width = 480,
  height = 140,
}: {
  points: SeriesPoint[];
  label: string;
  width?: number;
  height?: number;
}) {
  const deltas = rollingTotalDeltas(points);
  if (deltas.length === 0) {
    return (
      <p className="text-ink-faint text-sm">Trend history is still building for this window.</p>
    );
  }

  const maxAbs = Math.max(...deltas.map((point) => Math.abs(point.v)), 1);
  const latest = deltas[deltas.length - 1]!;
  const peak = deltas.reduce((best, point) => (point.v > best.v ? point : best), deltas[0]!);
  const trough = deltas.reduce((best, point) => (point.v < best.v ? point : best), deltas[0]!);
  const pad = 8;
  const barGap = 2;
  const usableWidth = width - pad * 2;
  const barWidth = Math.max(1, usableWidth / deltas.length - barGap);
  const half = (height - pad * 2) / 2;
  const center = height / 2;

  return (
    <figure>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}. Latest change ${formatSigned(latest.v)}.`}
      >
        <line
          x1={pad}
          x2={width - pad}
          y1={center}
          y2={center}
          className="stroke-edge"
          strokeWidth={1}
        />
        {deltas.map((point, index) => {
          const extent = (Math.abs(point.v) / maxAbs) * half;
          const rising = point.v >= 0;
          const y = rising ? center - extent : center;
          const x = pad + index * (barWidth + barGap);
          return (
            <rect
              key={`${point.t}-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(point.v === 0 ? 1 : extent, point.v === 0 ? 1 : 0)}
              rx={1}
              className={rising ? "fill-accent/80" : "fill-danger/80"}
            >
              <title>{`${formatSeriesTick(point.t)} — ${formatSigned(point.v)}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="text-ink-faint mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px]">
        <span>Largest rise {formatSigned(peak.v)}</span>
        <span>Latest {formatSigned(latest.v)}</span>
        <span>Largest fall {formatSigned(trough.v)}</span>
      </figcaption>
    </figure>
  );
}
