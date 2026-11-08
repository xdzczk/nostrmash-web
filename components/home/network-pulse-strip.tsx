import { Sparkline, type SeriesPoint } from "@/components/charts/sparkline";
import { CausalValue } from "@/components/discover/causal-value";
import { formatCompactNumber, formatMetricLabel, formatValue } from "@/components/explorer/utils";
import { baselineComparison, readEntityBaseline } from "@/lib/discover/baseline";
import { vsBaseline } from "@/lib/format/relative";
import { coverageChangeLabel, type CoverageNote } from "@/lib/stats/coverage-notes";
import type { EntityBaseline } from "@/lib/types/api";
import { seriesJumpIndexes } from "@/lib/stats/series-jumps";

function seriesMedian(points: SeriesPoint[]): number | null {
  if (points.length < 4) return null;
  const values = [...points.map((point) => point.v)].sort((left, right) => left - right);
  const mid = Math.floor(values.length / 2);
  const lower = values[mid - 1];
  const upper = values[mid];
  if (upper === undefined) return null;
  return values.length % 2 === 0 && lower !== undefined ? (lower + upper) / 2 : upper;
}

type PulseStat = {
  label: string;
  value: string | number | boolean | null | undefined;
  series?: SeriesPoint[];
  baseline?: EntityBaseline | null;
};

function isEmptyNumeric(value: PulseStat["value"]): boolean {
  return typeof value === "number" && Number.isFinite(value) && value === 0;
}

function hasRealValue(stat: PulseStat): boolean {
  if (stat.value == null) return false;
  if (isEmptyNumeric(stat.value)) return false;
  if (typeof stat.value === "string" && stat.value.trim().length === 0) return false;
  return true;
}

/**
 * Open (un-boxed) strip of headline network figures, laid out with the same
 * rule-separated grammar as the ranked sections above it. Tiles without a
 * trend are filtered upstream (see `attachPulseSeries`), so a tile either
 * shows a sparkline or the whole strip has none.
 */
export function NetworkPulseStrip({
  title,
  stats,
  coverageNotes = [],
}: {
  title: string;
  stats: PulseStat[];
  coverageNotes?: readonly CoverageNote[];
}) {
  if (stats.length === 0) return null;

  const hasAnyReal = stats.some(hasRealValue);
  const visibleStats = hasAnyReal ? stats.filter(hasRealValue) : stats;
  if (visibleStats.length === 0) return null;
  const anySeries = visibleStats.some((stat) => stat.series && stat.series.length >= 2);
  // Four tiles lay out as 2×2 on laptops and a single row on wide screens so
  // the grid never leaves an orphan cell; three (or six) tiles keep 3-up.
  const evenLayout = visibleStats.length % 2 === 0 && visibleStats.length % 3 !== 0;
  const largeColumns = evenLayout ? "lg:grid-cols-2 xl:grid-cols-4" : "lg:grid-cols-3";
  const lgCols = evenLayout ? 2 : 3;
  const xlCols = evenLayout ? 4 : 3;
  const tileClassName = (index: number) =>
    [
      "border-edge/70 relative overflow-hidden py-5",
      index > 0 ? "border-t" : "",
      // sm: 2 columns
      index % 2 === 1 ? "sm:border-l sm:pl-6" : "sm:border-l-0 sm:pl-0",
      index < 2 ? "sm:border-t-0" : "sm:border-t",
      // lg
      index % lgCols !== 0 ? "lg:border-l lg:pl-6" : "lg:border-l-0 lg:pl-0",
      index < lgCols ? "lg:border-t-0" : "lg:border-t",
      // xl
      index % xlCols !== 0 ? "xl:border-l xl:pl-6" : "xl:border-l-0 xl:pl-0",
      index < xlCols ? "xl:border-t-0" : "xl:border-t",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <section aria-labelledby="network-pulse">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="nm-kicker flex items-center gap-2">
            <span className="nm-live-dot" aria-hidden />
            Network
          </p>
          <h2 id="network-pulse" className="nm-title text-ink mt-2">
            {title}
          </h2>
        </div>
        <p className="nm-meta hidden shrink-0 sm:block">
          Supporting evidence for the selected window
        </p>
      </div>
      <div className={`border-edge/70 mt-6 grid border-y sm:grid-cols-2 ${largeColumns}`}>
        {visibleStats.map((stat, index) => {
          const hasSeries = Boolean(stat.series && stat.series.length >= 2);
          const empty = isEmptyNumeric(stat.value);
          const displayValue = empty
            ? "—"
            : typeof stat.value === "number"
              ? formatCompactNumber(stat.value)
              : formatValue(stat.value);

          const series = stat.series ?? [];
          const latest = series[series.length - 1];
          const median = seriesMedian(series);
          const comparison =
            baselineComparison(readEntityBaseline(stat.baseline)) ??
            (latest && median !== null ? vsBaseline(latest.v, median) : null);
          const jumpIndex = seriesJumpIndexes(series).at(-1);
          const jump =
            jumpIndex !== undefined && series[jumpIndex]
              ? coverageChangeLabel(series[jumpIndex].t, coverageNotes)
              : null;

          return (
            <article key={stat.label} className={tileClassName(index)}>
              <p className="nm-meta">{formatMetricLabel(stat.label)}</p>
              <p className="text-ink mt-1.5 text-2xl font-semibold tracking-[-0.025em] tabular-nums">
                <CausalValue value={displayValue}>{displayValue}</CausalValue>
              </p>
              {comparison ? <p className="text-ink-muted mt-1 text-xs">{comparison}</p> : null}
              {hasSeries ? (
                <div className="text-link mt-2.5">
                  <Sparkline
                    points={series}
                    width={220}
                    height={36}
                    coverageNotes={coverageNotes}
                  />
                </div>
              ) : null}
              {jump ? <p className="text-ink-faint mt-1 text-xs">{jump}</p> : null}
            </article>
          );
        })}
      </div>
      {!anySeries ? (
        <p className="nm-meta mt-3">Trend history is still building for this window.</p>
      ) : null}
    </section>
  );
}
