import type { ReactNode } from "react";

import { cardTierClassName } from "@/components/explorer/card-grammar";
import { formatCompactNumber, formatMetricLabel, formatValue } from "@/components/explorer/utils";

export function StatCard({
  label,
  value,
  description,
  delta,
  plain = false,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  description?: string;
  /** Change versus the previous window, already formatted. */
  delta?: string;
  /** Keep `label` as written. Otherwise it is treated as a metric key. */
  plain?: boolean;
}) {
  const shown = typeof value === "number" ? formatCompactNumber(value) : formatValue(value);
  const rising = delta?.trim().startsWith("+");
  const falling = delta?.trim().startsWith("-");
  return (
    <article className={cardTierClassName("utility")}>
      <p className="text-ink-faint text-[11px] font-medium">
        {plain ? label : formatMetricLabel(label)}
      </p>
      <p className="text-ink mt-2 text-xl font-semibold tabular-nums sm:text-2xl">{shown}</p>
      {delta ? (
        <p
          className={`mt-1 text-xs tabular-nums ${
            rising ? "text-success-ink" : falling ? "text-danger-ink" : "text-ink-muted"
          }`}
        >
          {delta}
        </p>
      ) : null}
      {description ? <p className="text-ink-muted mt-1 text-xs leading-5">{description}</p> : null}
    </article>
  );
}

/** Auto-fit so 4, 5, or 7 cards wrap without a single leftover column. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid [grid-template-columns:repeat(auto-fit,minmax(12.5rem,1fr))] gap-3">
      {children}
    </div>
  );
}
