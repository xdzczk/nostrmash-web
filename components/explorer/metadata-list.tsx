import { formatMetricLabel, formatValue } from "@/components/explorer/utils";

export function MetadataList({
  items,
  columns = 1,
  normalizeLabels = true,
}: {
  items: Array<{ label: string; value: unknown }>;
  columns?: 1 | 2;
  normalizeLabels?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <dl
      className={`grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"} rounded-lg border border-zinc-800 bg-zinc-900/40 p-4`}
    >
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <dt className="text-[11px] tracking-wide text-zinc-500 uppercase">
            {normalizeLabels ? formatMetricLabel(item.label) : item.label}
          </dt>
          <dd className="text-sm break-words text-zinc-200">{formatValue(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
