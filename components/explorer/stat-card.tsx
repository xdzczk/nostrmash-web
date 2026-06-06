import { cardTierClassName } from "@/components/explorer/card-grammar";
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
    <article className={cardTierClassName("utility")}>
      <p className="text-ink-faint text-[11px] font-medium">{formatMetricLabel(label)}</p>
      <p className="text-ink mt-2 text-xl font-semibold sm:text-2xl">{formatValue(value)}</p>
      {description ? <p className="text-ink-muted mt-1 text-xs leading-5">{description}</p> : null}
    </article>
  );
}
