import { coverageChangeLabel, type CoverageNote } from "@/lib/stats/coverage-notes";
import { seriesJumpIndexes } from "@/lib/stats/series-jumps";

export type SeriesPoint = { t: number; v: number };

/** Pure-SVG area/line sparkline — no client JS. */
export function Sparkline({
  points,
  width = 160,
  height = 36,
  className = "",
  stroke = "currentColor",
  fill = "currentColor",
  coverageNotes = [],
}: {
  points: SeriesPoint[];
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
  fill?: string;
  coverageNotes?: readonly CoverageNote[];
}) {
  if (points.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`text-ink-faint ${className}`}
        aria-hidden
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeDasharray="2 3"
          strokeWidth={1}
        />
      </svg>
    );
  }

  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((point, index) => {
    const x = index * stepX;
    const y = height - ((point.v - min) / range) * (height - 4) - 2;
    return { x, y };
  });
  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const jumps = seriesJumpIndexes(points);
  const jumpLabel =
    jumps.length > 0
      ? coverageChangeLabel(points[jumps[jumps.length - 1]!]!.t, coverageNotes)
      : null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={jumpLabel ? `Time series sparkline. ${jumpLabel}.` : "Time series sparkline"}
    >
      <path d={area} fill={fill} opacity={0.15} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      {jumps.map((index) => {
        const point = coords[index];
        const sample = points[index];
        if (!point || !sample) return null;
        return (
          <circle key={sample.t} cx={point.x} cy={point.y} r={2.5} fill={stroke}>
            <title>{coverageChangeLabel(sample.t, coverageNotes)}</title>
          </circle>
        );
      })}
    </svg>
  );
}
