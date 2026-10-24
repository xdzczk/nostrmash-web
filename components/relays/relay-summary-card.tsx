import Link from "next/link";

import { formatRelativeAge } from "@/lib/time/freshness";
import { relaySearchHref } from "@/components/relays/relay-link";
import { StatusPill } from "@/components/relays/status-pill";

export function RelaySummaryCard({
  host,
  rank,
  sharePercent,
  events,
  authors,
  healthy,
  status,
  checkpointAt,
  lastError,
  observationCount = 1,
}: {
  host: string;
  rank: number | null;
  sharePercent: string | null;
  events: number | null;
  authors: number | null;
  healthy: boolean | null;
  status?: string;
  checkpointAt?: string | number;
  lastError?: string;
  observationCount?: number;
}) {
  const checkpointAge = formatRelativeAge(checkpointAt);
  const hasActivity = rank !== null || events !== null;
  const hasHealth = healthy !== null || Boolean(status) || Boolean(checkpointAge);

  return (
    <article className="border-edge/80 space-y-3 border-y py-5">
      {hasActivity ? (
        <p className="text-ink text-base">
          {rank !== null ? `Rank ${rank.toLocaleString()} by indexed events` : "Indexed events"}
          {sharePercent ? `, ${sharePercent}% of this ranking` : ""}.
        </p>
      ) : (
        <p className="text-ink-muted text-sm">This host is not in the current activity ranking.</p>
      )}
      <p className="text-ink-faint text-sm">
        {events !== null ? `${events.toLocaleString()} events` : "Event count unavailable"}
        {authors !== null ? ` · ${authors.toLocaleString()} pubkeys seen on relays` : ""}
      </p>
      {hasHealth ? (
        <div className="flex flex-wrap items-center gap-2">
          {healthy === true ? <StatusPill tone="ok">Healthy</StatusPill> : null}
          {healthy === false ? <StatusPill tone="bad">Unhealthy</StatusPill> : null}
          {healthy === null && status ? <StatusPill tone="neutral">{status}</StatusPill> : null}
          <span
            className="text-ink-faint text-xs"
            title={checkpointAt == null ? undefined : String(checkpointAt)}
          >
            {checkpointAge ? `Checkpoint ${checkpointAge}` : "No checkpoint time"}
          </span>
        </div>
      ) : (
        <p className="text-ink-muted text-sm">
          No health check for this host in the latest response.
        </p>
      )}
      {observationCount > 1 ? (
        <p className="text-ink-muted text-sm">
          {observationCount.toLocaleString()} URLs on this host share this page. This is the
          checkpoint listed first on the health page.
        </p>
      ) : null}
      {lastError ? <p className="text-danger-ink text-sm">{lastError}</p> : null}
      <div className="flex flex-wrap gap-x-4">
        <Link href="/relays" className="nm-action-link">
          Activity ranking
        </Link>
        <Link href={`/relays/health#relay-${encodeURIComponent(host)}`} className="nm-action-link">
          Health row
        </Link>
        <Link href={relaySearchHref(host)} className="nm-action-link">
          Search mentions
        </Link>
      </div>
    </article>
  );
}
