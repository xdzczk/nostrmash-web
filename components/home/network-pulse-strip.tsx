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

  return (
    <section className="space-y-3.5">
      <div className="space-y-1.5">
        <p className="text-ink-faint flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase">
          <span className="nm-live-dot" aria-hidden />
          {title}
        </p>
        <p className="text-ink-muted max-w-2xl text-sm leading-6">
          Supporting network evidence for the selected ranking window.
        </p>
      </div>
      <div className="border-edge/70 grid border-y sm:grid-cols-2 lg:grid-cols-3">
        {visibleStats.map((stat, index) => {
          const hasSeries = Boolean(stat.series && stat.series.length >= 2);
          const empty = isEmptyNumeric(stat.value);
          const displayValue = empty
            ? "—"
            : typeof stat.value === "number"
              ? formatCompactNumber(stat.value)
              : formatValue(stat.value);

          return (
            <article
              key={stat.label}
              className={`relative overflow-hidden py-4 ${
                index > 0 ? "sm:border-edge/70 sm:border-l sm:pl-5" : ""
              }`}
            >
              <p className="text-ink-faint text-[11px]">{formatMetricLabel(stat.label)}</p>
              <p className="text-ink mt-1.5 text-xl font-semibold tracking-tight tabular-nums">
                <CausalValue value={displayValue}>{displayValue}</CausalValue>
              </p>
              {hasSeries ? (
                <div className="text-link mt-2.5">
                  <Sparkline points={stat.series!} width={220} height={36} />
                </div>
              ) : (
                <p className="text-ink-faint mt-2.5 text-[11px]">
                  {empty ? "No data yet for this window" : "Trend history not available"}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
