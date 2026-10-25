import Link from "next/link";

import { CopyValueButton } from "@/components/actions/copy-value-button";
import { relaySearchHref } from "@/components/relays/relay-link";
import { StatusPill } from "@/components/relays/status-pill";
import { Disclosure } from "@/components/ui/disclosure";
import { ingestFailureCopy, classifyIngestError } from "@/lib/relays/ingest-errors";
import { buildWindowHref, type StatsWindow } from "@/lib/search-params/window";
import { formatRelativeAge } from "@/lib/time/freshness";

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-ink text-2xl font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
      <p className="text-ink-muted mt-1 text-sm">{label}</p>
    </div>
  );
}

export function RelaySummaryCard({
  host,
  rank,
  sharePercent,
  events,
  authors,
  listedRank,
  listedUsers,
  listedKnown,
  healthy,
  checkpointAt,
  lastError,
  observationCount = 1,
  connectLabel,
  connectLatencyMs,
  relayUrl,
  window,
}: {
  host: string;
  rank: number | null;
  sharePercent: string | null;
  events: number | null;
  authors: number | null;
  listedRank: number | null;
  listedUsers: number | null;
  /** True when the popular-relay page we checked is only a prefix of the ranking. */
  listedKnown: boolean;
  healthy: boolean | null;
  checkpointAt?: string | number;
  lastError?: string;
  observationCount?: number;
  connectLabel: string | null;
  connectLatencyMs?: number;
  relayUrl: string;
  window: StatsWindow;
}) {
  const checkpointAge = formatRelativeAge(checkpointAt);
  const failure = classifyIngestError(lastError);
  const failureCopy =
    healthy === false && failure !== "none" ? ingestFailureCopy(failure).summary : null;
  const rankingHref = buildWindowHref("/relays", new URLSearchParams(), window);

  return (
    <article className="border-edge/80 space-y-6 border-y py-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <Figure
          value={sharePercent ? `${sharePercent}%` : "—"}
          label={rank !== null ? "Of indexed events" : "Not in this indexed ranking"}
        />
        <Figure value={events !== null ? events.toLocaleString() : "—"} label="Events" />
        <Figure value={authors !== null ? authors.toLocaleString() : "—"} label="Authors" />
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-ink-faint text-xs">Indexed rank</dt>
          <dd className="text-ink mt-1 text-sm">
            {rank !== null ? `#${rank.toLocaleString()} in this ranking` : "Outside this ranking"}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint text-xs">Listed by people</dt>
          <dd className="text-ink mt-1 text-sm">
            {listedRank !== null
              ? `#${listedRank.toLocaleString()}${
                  listedUsers !== null ? ` · ${listedUsers.toLocaleString()} people` : ""
                }`
              : listedKnown
                ? "Outside the most-listed relays we loaded"
                : "Not in the public relay lists we ranked"}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint text-xs">Last ingest</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            {healthy === true ? <StatusPill tone="ok">Healthy</StatusPill> : null}
            {healthy === false ? <StatusPill tone="bad">Failing</StatusPill> : null}
            {healthy === null ? <StatusPill tone="neutral">No checkpoint</StatusPill> : null}
            <span className="text-ink-muted text-sm">
              {checkpointAge ? checkpointAge : "No checkpoint time"}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint text-xs">Last connection check</dt>
          <dd className="text-ink mt-1 text-sm">
            {connectLabel
              ? `${connectLabel}${
                  connectLatencyMs !== undefined ? ` · ${Math.round(connectLatencyMs)}ms` : ""
                }`
              : "No connection check in the latest results"}
          </dd>
        </div>
      </dl>

      {failureCopy ? <p className="text-ink-muted text-sm">{failureCopy}</p> : null}
      {observationCount > 1 ? (
        <p className="text-ink-muted text-sm">
          {observationCount.toLocaleString()} URLs on this host share this page. Ingest is the
          checkpoint listed first among them.
        </p>
      ) : null}
      {lastError ? (
        <Disclosure title="Technical detail" description="The raw ingest check.">
          <p className="text-ink-muted font-mono text-xs break-all">{lastError}</p>
        </Disclosure>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <CopyValueButton value={relayUrl} label="Copy relay URL" />
        <Link href={rankingHref} className="nm-action-link">
          Activity ranking
        </Link>
        <Link href={`/relays/health#relay-${encodeURIComponent(host)}`} className="nm-action-link">
          Status
        </Link>
        <Link href={relaySearchHref(host)} className="nm-action-link">
          Notes that mention this hostname
        </Link>
      </div>
    </article>
  );
}
