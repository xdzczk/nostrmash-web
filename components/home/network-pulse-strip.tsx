import { PulseSparkline } from "@/components/home/pulse-sparkline";
import { formatMetricLabel, formatValue } from "@/components/explorer/utils";

type PulseStat = {
  label: string;
  value: string | number | boolean | null | undefined;
};

export function NetworkPulseStrip({ title, stats }: { title: string; stats: PulseStat[] }) {
  if (stats.length === 0) return null;

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
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="border-edge/85 bg-surface/30 nm-lift relative overflow-hidden rounded-xl border px-3.5 pt-3 pb-2.5"
          >
            <p className="text-ink-faint text-[11px] tracking-[0.14em] uppercase">
              {formatMetricLabel(stat.label)}
            </p>
            <p className="text-ink mt-1.5 text-xl font-semibold tracking-tight tabular-nums">
              {formatValue(stat.value)}
            </p>
            <PulseSparkline seed={stat.label} className="mt-2.5" />
          </article>
        ))}
      </div>
    </section>
  );
}
