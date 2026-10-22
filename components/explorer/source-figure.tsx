import { sourceCount } from "@/lib/discover/reasons";
import type { DiscoveryItemRanking } from "@/lib/types/api";

/** The figure a ranked row is ordered by: how many sources are behind it. */
export function SourceFigure({
  ranking,
  className = "",
}: {
  ranking?: DiscoveryItemRanking;
  className?: string;
}) {
  const count = sourceCount(ranking);
  if (count === null) return null;
  const label = count.toLocaleString();
  return (
    <span
      className={`inline-flex shrink-0 flex-col items-end gap-1 ${className}`}
      title={`${label} sources`}
    >
      <span className="sr-only">{label} sources</span>
      <span
        aria-hidden
        className="text-ink text-lg leading-none font-medium tracking-[-0.04em] tabular-nums"
      >
        {label}
      </span>
      <span
        aria-hidden
        className="text-ink-faint text-[10px] leading-none font-medium tracking-[0.14em] uppercase"
      >
        sources
      </span>
    </span>
  );
}
