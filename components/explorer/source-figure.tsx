import { sourceCount } from "@/lib/discover/reasons";
import type { DiscoveryItemRanking } from "@/lib/types/api";

/** The figure a ranked row is ordered by. Hashtags use authors; other lists use sources. */
export function SourceFigure({
  ranking,
  noun = "sources",
  className = "",
}: {
  ranking?: DiscoveryItemRanking;
  noun?: string;
  className?: string;
}) {
  const count = sourceCount(ranking);
  if (count === null) return null;
  const label = count.toLocaleString();
  const caption = count === 1 ? noun.replace(/s$/, "") : noun;
  return (
    <span
      className={`inline-flex shrink-0 flex-col items-end gap-1 ${className}`}
      title={`${label} ${caption}`}
    >
      <span className="sr-only">
        {label} {caption}
      </span>
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
        {caption}
      </span>
    </span>
  );
}
