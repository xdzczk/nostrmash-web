import Link from "next/link";

import { cardTierClassName } from "@/components/explorer/card-grammar";
import { WhyNow, type WhyNowReason } from "@/components/explorer/why-now";

export function HashtagChip({
  hashtag,
  count,
  href,
  rank,
  whyNow = [],
}: {
  hashtag: string;
  count?: number;
  href?: string;
  rank?: number;
  whyNow?: WhyNowReason[];
}) {
  const isTopRank = typeof rank === "number" && rank <= 3;
  const countLabel = typeof count === "number" ? `${count.toLocaleString()} mentions` : "—";
  const content = (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={`min-w-0 truncate text-sm font-medium ${isTopRank ? "text-ink" : "text-ink-soft"}`}
        >
          {typeof rank === "number" ? (
            <span className={isTopRank ? "text-link mr-1" : "text-ink-faint mr-1"}>#{rank}</span>
          ) : null}
          #{hashtag}
        </p>
        <span className="text-ink-faint shrink-0 text-[11px]">{countLabel}</span>
      </div>
      <WhyNow reasons={whyNow} maxReasons={1} className="mt-2" />
    </div>
  );

  if (!href) {
    return (
      <div className={`${cardTierClassName("compact")} border-edge/70 bg-surface-sunken/30`}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`block ${cardTierClassName("compact")} border-edge/70 bg-surface-sunken/30 hover:bg-surface-sunken/45 transition`}
    >
      {content}
    </Link>
  );
}
