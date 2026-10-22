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
      className={`text-ink shrink-0 text-lg leading-none font-medium tracking-[-0.04em] tabular-nums ${className}`}
      title={`${label} sources`}
    >
      <span className="sr-only">{label} sources</span>
      <span aria-hidden>{label}</span>
    </span>
  );
}
