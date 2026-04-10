import { formatMetricLabel, formatValue } from "@/components/explorer/utils";

type PulseStat = {
  label: string;
  value: string | number | boolean | null | undefined;
};

export function NetworkPulseStrip({ title, stats }: { title: string; stats: PulseStat[] }) {
  if (stats.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-500 uppercase">{title}</p>
        <p className="max-w-2xl text-sm leading-6 text-zinc-400">
          A compact read on the broader network before the page settles into its closing discovery
          cues.
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-xl border border-zinc-800/85 bg-zinc-900/30 px-3.5 py-3"
          >
            <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
              {formatMetricLabel(stat.label)}
            </p>
            <p className="mt-1.5 text-base font-semibold tracking-tight text-zinc-100">
              {formatValue(stat.value)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
