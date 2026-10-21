import { Sparkline, type SeriesPoint } from "@/components/charts/sparkline";
import { CausalValue } from "@/components/discover/causal-value";
import { formatCompactNumber, formatMetricLabel, formatValue } from "@/components/explorer/utils";

type PulseStat = {
  label: string;
  value: string | number | boolean | null | undefined;
  series?: SeriesPoint[];
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

export function NetworkPulseStrip({ title, stats }: { title: string; stats: PulseStat[] }) {
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
      index % 2 === 1 ? "sm:border-l sm:pl-5" : "sm:border-l-0 sm:pl-0",
      index < 2 ? "sm:border-t-0" : "sm:border-t",
      // lg
      index % lgCols !== 0 ? "lg:border-l lg:pl-5" : "lg:border-l-0 lg:pl-0",
      index < lgCols ? "lg:border-t-0" : "lg:border-t",
      // xl
      index % xlCols !== 0 ? "xl:border-l xl:pl-5" : "xl:border-l-0 xl:pl-0",
      index < xlCols ? "xl:border-t-0" : "xl:border-t",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <section className="nm-network-field space-y-3.5 px-5 py-5 sm:px-6 sm:py-6">
      <div className="space-y-1.5">
        <p className="nm-kicker flex items-center gap-2">
          <span className="nm-live-dot" aria-hidden />
          {title}
        </p>
        <p className="text-ink-muted max-w-2xl text-sm leading-6">
          Supporting network evidence for the selected ranking window.
        </p>
      </div>
      <div className={`border-edge/80 grid border-y sm:grid-cols-2 ${largeColumns}`}>
        {visibleStats.map((stat, index) => {
          const hasSeries = Boolean(stat.series && stat.series.length >= 2);
          const empty = isEmptyNumeric(stat.value);
          const displayValue = empty
            ? "—"
            : typeof stat.value === "number"
              ? formatCompactNumber(stat.value)
              : formatValue(stat.value);

          return (
            <article key={stat.label} className={tileClassName(index)}>
              <p className="nm-meta">{formatMetricLabel(stat.label)}</p>
              <p className="text-ink mt-1.5 text-2xl font-semibold tracking-[-0.025em] tabular-nums">
                <CausalValue value={displayValue}>{displayValue}</CausalValue>
              </p>
              {hasSeries ? (
                <div className="text-link mt-2.5">
                  <Sparkline points={stat.series!} width={220} height={36} />
                </div>
              ) : anySeries ? (
                <p className="nm-meta text-ink-faint mt-2.5 flex h-9 items-end">No trend yet</p>
              ) : null}
            </article>
          );
        })}
      </div>
      {!anySeries ? (
        <p className="nm-meta">Historical trend series are still building for this window.</p>
      ) : null}
    </section>
  );
}
