import { formatMetricLabel, formatValue } from "@/components/explorer/utils";

type PulseStat = {
  label: string;
  value: string | number | boolean | null | undefined;
};

export function NetworkPulseStrip({ title, stats }: { title: string; stats: PulseStat[] }) {
  if (stats.length === 0) return null;

  return (
    <section className="space-y-2">
      <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-500 uppercase">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-lg border border-zinc-800 bg-zinc-900/45 px-3 py-3 sm:px-3.5 sm:py-3.5"
          >
            <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
              {formatMetricLabel(stat.label)}
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-zinc-100">
              {formatValue(stat.value)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
