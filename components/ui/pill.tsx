import Link from "next/link";
import type { ReactNode } from "react";

export type PillTone = "freshness" | "entity" | "reason" | "stat" | "rank" | "neutral";

const PILL_TONE: Record<PillTone, string> = {
  freshness: "border-edge bg-transparent text-ink-muted",
  entity: "border-accent-soft/35 bg-accent/8 text-link-hover",
  reason: "border-edge bg-transparent text-ink-muted",
  stat: "border-edge bg-surface/45 text-ink-soft",
  rank: "border-accent-soft/35 bg-accent/8 text-accent-ink",
  neutral: "border-edge bg-transparent text-ink-muted",
};

const BASE = "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium";

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
