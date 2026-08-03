import Link from "next/link";

import { Pill, type PillTone } from "@/components/ui/pill";
import { formatMetricLabel, formatValue, truncateMiddle } from "@/components/explorer/utils";

export type CardTier = "standard" | "compact" | "utility";
export type { PillTone };

const TIER_SURFACE: Record<CardTier, string> = {
  standard:
    "border-b border-edge/65 bg-transparent px-1 py-5 transition-colors hover:bg-surface/25 sm:px-2 sm:py-6",
  compact: "rounded-lg bg-surface-sunken/45 px-3 py-2.5",
  utility: "rounded-xl border border-edge/65 bg-surface/55 p-4",
};

export type DiscoveryAction = {
  label: string;
  href?: string | null;
};

export function cardTierClassName(tier: CardTier): string {
  return TIER_SURFACE[tier];
}

export function DiscoveryPill({
  tone,
  children,
  className = "",
}: {
  tone: PillTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Pill tone={tone} className={className}>
      {children}
    </Pill>
  );
}

export function DiscoveryStatPills({
  stats,
  className = "",
  compact = false,
}: {
  stats: Array<{ label: string; value: unknown; detail?: string }>;
  className?: string;
  compact?: boolean;
}) {
  if (stats.length === 0) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1.5 ${compact ? "text-xs" : "text-[13px]"} ${className}`.trim()}
    >
      {stats.map((metric, index) => (
        <span key={metric.label} className="inline-flex items-center gap-1.5">
          {index > 0 ? (
            <span aria-hidden className="text-ink-faint/70">
              •
            </span>
          ) : null}
          <span className="text-ink-faint">{formatMetricLabel(metric.label)}</span>
          <span className="text-ink-soft font-medium">
            {truncateMiddle(formatValue(metric.value), compact ? 14 : 18)}
          </span>
          {metric.detail ? <span className="text-ink-muted">({metric.detail})</span> : null}
        </span>
      ))}
    </div>
  );
}

export function DiscoveryActionLinks({
  actions,
  className = "",
}: {
  actions: DiscoveryAction[];
  className?: string;
}) {
  const visibleActions = actions.filter(
    (action): action is { label: string; href: string } =>
      typeof action.href === "string" && action.href.length > 0
  );
  if (visibleActions.length === 0) return null;
  return (
    <div
      className={`text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] ${className}`.trim()}
    >
      {visibleActions.map((action, index) => (
        <span key={action.label} className="inline-flex items-center gap-2">
          {index > 0 ? (
            <span aria-hidden className="text-ink-faint/70">
              •
            </span>
          ) : null}
          <Link
            href={action.href}
            className="focus-visible:ring-accent-soft/70 text-link hover:text-link-hover rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {action.label}
          </Link>
        </span>
      ))}
    </div>
  );
}
