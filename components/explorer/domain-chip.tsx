import Link from "next/link";

import { cardTierClassName } from "@/components/explorer/card-grammar";
import type { DomainSupportingSignal } from "@/components/explorer/domain-supporting-signal";
import { normalizeDomainLabel, truncateIdentifier } from "@/components/explorer/utils";
import { WhyNow, type WhyNowReason } from "@/components/explorer/why-now";

export function DomainChip({
  domain,
  supportingSignal,
  href,
  rank,
  whyNow = [],
}: {
  domain: string;
  supportingSignal?: DomainSupportingSignal | null;
  href?: string;
  rank?: number;
  whyNow?: WhyNowReason[];
}) {
  const isTopRank = typeof rank === "number" && rank <= 3;
  const normalizedDomain = normalizeDomainLabel(domain);
  const displayDomain = truncateIdentifier(normalizedDomain, "domain", "primary");
  const content = (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {typeof rank === "number" ? (
          <span
            className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tracking-[0.14em] uppercase ${
              isTopRank
                ? "border-indigo-400/60 bg-indigo-400/12 text-indigo-200"
                : "border-zinc-700/80 bg-zinc-900/75 text-zinc-400"
            }`}
          >
            {rank}
          </span>
        ) : null}
        <p
          className={`min-w-0 flex-1 truncate text-sm font-medium ${isTopRank ? "text-zinc-100" : "text-zinc-200"}`}
          title={normalizedDomain}
        >
          {displayDomain}
        </p>
        {supportingSignal ? (
          <span className="shrink-0 text-[11px] text-zinc-500">{supportingSignal.valueLabel}</span>
        ) : null}
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
