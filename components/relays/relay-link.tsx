import type { ReactNode } from "react";
import Link from "next/link";

import type { StatsWindow } from "@/lib/search-params/window";

export function relayHref(host: string, window?: StatsWindow): string {
  const path = `/relays/${encodeURIComponent(host)}`;
  if (!window || window === "24h") return path;
  return `${path}?window=${window}`;
}

export function relaySearchHref(query: string): string {
  return `/search?q=${encodeURIComponent(query)}&tab=all`;
}

/** The relay host is the hit target. Rank is optional. `label` can include a URL path. */
export function RelayLink({
  host,
  rank,
  label,
  window,
  icon,
}: {
  host: string;
  rank?: number;
  label?: string;
  window?: StatsWindow;
  /** Sits between the rank and the name. The link still opens this host. */
  icon?: ReactNode;
}) {
  return (
    <Link
      href={relayHref(host, window)}
      className="nm-pressable text-ink hover:text-link focus-visible:ring-accent-soft/70 inline-flex min-h-11 max-w-full items-center gap-2 rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
    >
      {typeof rank === "number" ? (
        <span className="text-ink-faint w-8 shrink-0 font-normal tabular-nums">{`#${rank}`}</span>
      ) : null}
      {icon}
      <span className="truncate">{label && label.length > 0 ? label : host}</span>
    </Link>
  );
}
