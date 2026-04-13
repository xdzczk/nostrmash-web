import Link from "next/link";

import { formatMetricLabel, formatValue, truncateMiddle } from "@/components/explorer/utils";

export type CardTier = "lead" | "standard" | "compact" | "utility";
export type PillTone = "freshness" | "entity" | "reason" | "stat" | "rank";

const TIER_SURFACE: Record<CardTier, string> = {
  lead: "rounded-[1.65rem] border border-zinc-700/70 bg-zinc-900/55 p-5 sm:p-6",
  standard: "rounded-[1.15rem] border border-zinc-800/85 bg-zinc-900/45 p-4 sm:p-5",
  compact: "rounded-xl border border-zinc-800/85 bg-zinc-950/35 px-3 py-2.5",
  utility: "rounded-lg border border-zinc-800/95 bg-zinc-900/50 p-4",
};

const PILL_TONE: Record<PillTone, string> = {
  freshness: "border-zinc-700/80 bg-zinc-950/45 text-zinc-300",
  entity: "border-indigo-400/30 bg-indigo-500/10 text-indigo-200",
  reason: "border-zinc-700/75 bg-zinc-900/70 text-zinc-300",
  stat: "border-zinc-700/80 bg-zinc-900/60 text-zinc-200",
  rank: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
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
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${PILL_TONE[tone]} ${className}`.trim()}
    >
      {children}
    </span>
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
      {stats.map((metric) => (
        <span
          key={metric.label}
          className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-900/60 ${compact ? "px-2 py-0.5" : "px-2.5 py-1"}`}
        >
          <span className="text-zinc-500">{formatMetricLabel(metric.label)}</span>
          <span className="font-medium text-zinc-100">
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
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 ${className}`.trim()}
    >
      {visibleActions.map((action, index) => (
        <span key={action.label} className="inline-flex items-center gap-2">
          {index > 0 ? <span className="text-zinc-600">•</span> : null}
          <Link href={action.href} className="text-indigo-300 hover:text-indigo-200">
            {action.label}
          </Link>
        </span>
      ))}
    </div>
  );
}
