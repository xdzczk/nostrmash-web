import { formatMetricLabel, formatValue } from "@/components/explorer/utils";

export function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  description?: string;
}) {
  return (
    <article className="rounded-lg border border-zinc-800/95 bg-zinc-900/50 p-4">
      <p className="text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
        {formatMetricLabel(label)}
      </p>
      <p className="mt-2 text-xl font-semibold text-zinc-100 sm:text-2xl">{formatValue(value)}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-zinc-400">{description}</p> : null}
    </article>
  );
}
