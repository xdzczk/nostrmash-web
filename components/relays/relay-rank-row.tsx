import type { StatsWindow } from "@/lib/search-params/window";

import { RelayLink } from "@/components/relays/relay-link";
import { ShareBar } from "@/components/relays/share-bar";

/** A ranking row whose figure is the point, and whose host is the link. */
export function RelayRankRow({
  host,
  rank,
  window,
  value,
  detail,
  bar,
}: {
  host: string;
  rank?: number;
  window?: StatsWindow;
  value: string;
  detail: string;
  bar?: { value: number; max: number; label: string };
}) {
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-4">
        <RelayLink host={host} rank={rank} window={window} />
        <p className="text-ink shrink-0 text-xl font-semibold tracking-[-0.03em] tabular-nums">
          {value}
        </p>
      </div>
      <p className="text-ink-muted mt-0.5 text-sm">{detail}</p>
      {bar ? <ShareBar value={bar.value} max={bar.max} label={bar.label} /> : null}
    </li>
  );
}
