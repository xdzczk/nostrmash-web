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
      className={`grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"} border-edge bg-surface/40 rounded-lg border p-4`}
    >
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <dt className="text-ink-faint text-[11px] tracking-wide uppercase">
            {normalizeLabels ? formatMetricLabel(item.label) : item.label}
          </dt>
          <dd className="text-ink-soft text-sm break-words">{formatValue(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
