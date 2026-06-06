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
                ? "border-accent-soft/60 bg-accent-soft/12 text-link-hover"
                : "border-edge-strong/80 bg-surface/75 text-ink-muted"
            }`}
          >
            {rank}
          </span>
        ) : null}
        <p
          className={`min-w-0 flex-1 truncate text-sm font-medium ${isTopRank ? "text-ink" : "text-ink-soft"}`}
          title={normalizedDomain}
        >
          {displayDomain}
        </p>
        {supportingSignal ? (
          <span className="text-ink-faint shrink-0 text-[11px]">{supportingSignal.valueLabel}</span>
        ) : null}
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
