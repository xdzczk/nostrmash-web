import Link from "next/link";

import { Pill, type PillTone } from "@/components/ui/pill";
import { formatMetricLabel, formatValue, truncateMiddle } from "@/components/explorer/utils";

export type CardTier = "lead" | "standard" | "compact" | "utility";
export type { PillTone };

const TIER_SURFACE: Record<CardTier, string> = {
  lead: "rounded-[1.65rem] border border-edge-strong/70 bg-surface/55 p-5 sm:p-6",
  standard: "rounded-[1.15rem] border border-edge/85 bg-surface/45 p-4 sm:p-5",
  compact: "rounded-xl border border-edge/85 bg-surface-sunken/35 px-3 py-2.5",
  utility: "rounded-lg border border-edge/95 bg-surface/50 p-4",
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
  stats: Array<{ label: string; value: unknown }>;
  className?: string;
  compact?: boolean;
}) {
  if (stats.length === 0) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1.5 ${compact ? "text-[11px]" : "text-xs"} ${className}`.trim()}
    >
      {stats.map((metric, index) => (
        <span key={metric.label} className="inline-flex items-center gap-1.5">
          {index > 0 ? (
            <span aria-hidden className="text-zinc-600">
              •
            </span>
          ) : null}
          <span className="text-ink-faint">{formatMetricLabel(metric.label)}</span>
          <span className="text-ink-soft font-medium">
            {truncateMiddle(formatValue(metric.value), compact ? 14 : 18)}
          </span>
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
      className={`text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${className}`.trim()}
    >
      {visibleActions.map((action, index) => (
        <span key={action.label} className="inline-flex items-center gap-2">
          {index > 0 ? (
            <span aria-hidden className="text-zinc-600">
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
