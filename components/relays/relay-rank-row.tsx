import type { StatsWindow } from "@/lib/search-params/window";

import { RelayLink } from "@/components/relays/relay-link";
import { ShareBar } from "@/components/relays/share-bar";
import { PlainRemoteImage } from "@/components/ui/plain-remote-image";

/** A ranking row whose figure is the point, and whose host is the link. */
export function RelayRankRow({
  host,
  rank,
  window,
  value,
  detail,
  bar,
  label,
  iconSrc,
}: {
  host: string;
  rank?: number;
  window?: StatsWindow;
  value: string;
  detail: string;
  bar?: { value: number; max: number; label: string };
  /** Relay-published name. The link still opens this host. Put the host in `detail`. */
  label?: string;
  /** Relay-published icon, shown beside the name. */
  iconSrc?: string;
}) {
  const name = label?.trim();
  const icon =
    name && iconSrc ? (
      <PlainRemoteImage
        src={iconSrc}
        alt=""
        width={20}
        height={20}
        loading="lazy"
        className="size-5 shrink-0 rounded-sm object-cover"
      />
    ) : null;

  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-4">
        <RelayLink host={host} rank={rank} window={window} label={name} icon={icon} />
        <p className="text-ink shrink-0 text-xl font-semibold tracking-[-0.03em] tabular-nums">
          {value}
        </p>
      </div>
      <p className="text-ink-muted mt-0.5 text-sm">{detail}</p>
      {bar ? <ShareBar value={bar.value} max={bar.max} label={bar.label} /> : null}
    </li>
  );
}
