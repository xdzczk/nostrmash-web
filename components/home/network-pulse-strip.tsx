import { Sparkline, type SeriesPoint } from "@/components/charts/sparkline";
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
          A live read on the broader network before the page settles into its closing discovery
          cues.
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleStats.map((stat) => {
          const hasSeries = Boolean(stat.series && stat.series.length >= 2);
          const empty = isEmptyNumeric(stat.value);

          return (
            <article
              key={stat.label}
              className="border-edge/85 bg-surface/30 nm-lift relative overflow-hidden rounded-xl border px-3.5 pt-3 pb-2.5"
            >
              <p className="text-ink-faint text-[11px]">{formatMetricLabel(stat.label)}</p>
              <p className="text-ink mt-1.5 text-xl font-semibold tracking-tight tabular-nums">
                {empty
                  ? "—"
                  : typeof stat.value === "number"
                    ? formatCompactNumber(stat.value)
                    : formatValue(stat.value)}
              </p>
              {hasSeries ? (
                <div className="text-accent mt-2.5">
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
