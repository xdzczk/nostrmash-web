import { formatValue } from "@/components/explorer/utils";

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
    <article className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{formatValue(value)}</p>
      {description ? <p className="mt-1 text-xs text-zinc-400">{description}</p> : null}
    </article>
  );
}
