import Link from "next/link";

import { cardTierClassName, DiscoveryPill } from "@/components/explorer/card-grammar";
import { normalizeDomainLabel, truncateIdentifier } from "@/components/explorer/utils";
import { WhyNow, type WhyNowReason } from "@/components/explorer/why-now";

export function DomainChip({
  domain,
  count,
  href,
  rank,
  whyNow = [],
}: {
  domain: string;
  count?: number;
  href?: string;
  rank?: number;
  whyNow?: WhyNowReason[];
}) {
  const isTopRank = typeof rank === "number" && rank <= 3;
  const normalizedDomain = normalizeDomainLabel(domain);
  const displayDomain = truncateIdentifier(normalizedDomain, "domain", "primary");
  const countLabel = typeof count === "number" ? `${count.toLocaleString()} notes` : "—";
  const content = (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={`min-w-0 truncate text-sm font-medium ${isTopRank ? "text-zinc-100" : "text-zinc-200"}`}
          title={normalizedDomain}
        >
          {typeof rank === "number" ? (
            <span className={isTopRank ? "mr-1 text-indigo-300" : "mr-1 text-zinc-500"}>
              #{rank}
            </span>
          ) : null}
          {displayDomain}
        </p>
        <DiscoveryPill tone="stat" className="shrink-0 px-2 py-0.5 text-[10px]">
          {countLabel}
        </DiscoveryPill>
      </div>
      <WhyNow reasons={whyNow} className="mt-2" />
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
