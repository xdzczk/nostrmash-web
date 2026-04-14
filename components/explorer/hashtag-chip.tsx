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
          className={`min-w-0 truncate text-sm font-medium ${isTopRank ? "text-zinc-100" : "text-zinc-200"}`}
        >
          {typeof rank === "number" ? (
            <span className={isTopRank ? "mr-1 text-indigo-300" : "mr-1 text-zinc-500"}>
              #{rank}
            </span>
          ) : null}
          #{hashtag}
        </p>
        <span className="shrink-0 text-[11px] text-zinc-500">{countLabel}</span>
      </div>
      <WhyNow reasons={whyNow} maxReasons={1} className="mt-2" />
    </div>
  );

  if (!href) {
    return (
      <div className={`${cardTierClassName("compact")} border-zinc-800/70 bg-zinc-950/30`}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`block ${cardTierClassName("compact")} border-zinc-800/70 bg-zinc-950/30 transition hover:bg-zinc-950/45`}
    >
      {content}
    </Link>
  );
}
