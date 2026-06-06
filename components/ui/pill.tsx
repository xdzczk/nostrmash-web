import Link from "next/link";
import type { ReactNode } from "react";

export type PillTone = "freshness" | "entity" | "reason" | "stat" | "rank" | "neutral";

const PILL_TONE: Record<PillTone, string> = {
  freshness: "border-edge-strong/80 bg-surface-sunken/45 text-ink-dim",
  entity: "border-accent-soft/30 bg-accent/10 text-link-hover",
  reason: "border-edge-strong/75 bg-surface/70 text-ink-dim",
  stat: "border-edge-strong/80 bg-surface/60 text-ink-soft",
  rank: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  neutral: "border-edge-strong bg-surface/40 text-ink-dim",
};

const BASE = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";

/**
 * Canonical pill / badge. Renders a static `<span>` by default, or an
 * interactive `<Link>` when `href` is provided (with press + focus affordances).
 */
export function Pill({
  tone = "neutral",
  href,
  title,
  className = "",
  children,
}: {
  tone?: PillTone;
  href?: string;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = `${BASE} ${PILL_TONE[tone]} ${className}`.trim();

  if (href) {
    return (
      <Link
        href={href}
        title={title}
        className={`nm-pressable hover:border-edge-strong focus-visible:ring-accent-soft/70 focus-visible:ring-2 focus-visible:outline-none ${classes}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <span title={title} className={classes}>
      {children}
    </span>
  );
}
