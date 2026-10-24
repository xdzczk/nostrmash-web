import type { RelayHealthSummary } from "@/components/explorer/stats-utils";
import { partitionRelayHealth, relayDisplayLabel } from "@/components/explorer/stats-utils";
import { RelayLink } from "@/components/relays/relay-link";
import { StatusPill } from "@/components/relays/status-pill";
import { formatRelativeAge } from "@/lib/time/freshness";

function checkpointText(row: RelayHealthSummary, nowMs: number): string {
  const age = formatRelativeAge(row.latestCheckpointAt ?? row.lastSeenAt, nowMs);
  return age ? `Checkpoint ${age}` : "No checkpoint";
}

function HealthRow({
  row,
  nowMs,
  anchor,
}: {
  row: RelayHealthSummary;
  nowMs: number;
  anchor?: string;
}) {
  const tone = row.healthy === false ? "bad" : row.healthy === true ? "warn" : "neutral";
  const label =
    row.healthy === false ? "Unhealthy" : row.healthy === true ? "Stale checkpoint" : "Unknown";
  const absolute = row.latestCheckpointAt ?? row.lastSeenAt;

  return (
    <li id={anchor} className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <RelayLink host={row.host} label={relayDisplayLabel(row.relay, row.host)} />
        <StatusPill tone={tone}>{label}</StatusPill>
      </div>
      <p className="text-ink-faint text-xs" title={absolute == null ? undefined : String(absolute)}>
        {checkpointText(row, nowMs)}
        {row.lastError ? ` · ${row.lastError}` : ""}
        {row.mode ? ` · Ingest mode ${row.mode}` : ""}
      </p>
    </li>
  );
}

function rowAnchor(row: RelayHealthSummary, seenHosts: Set<string>): string | undefined {
  if (seenHosts.has(row.host)) return undefined;
  seenHosts.add(row.host);
  return `relay-${encodeURIComponent(row.host)}`;
}

export function HealthRows({ rows, nowMs }: { rows: RelayHealthSummary[]; nowMs: number }) {
  const { attention, current } = partitionRelayHealth(rows, nowMs);
  const seenHosts = new Set<string>();

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h3 className="text-ink text-sm font-medium">Needs attention</h3>
        <p className="text-ink-muted text-sm">
          Unhealthy relays, unknown checks, and healthy relays whose last checkpoint is older than a
          day. Oldest first.
        </p>
        {attention.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {attention.map((row) => (
              <HealthRow
                key={row.relay}
                row={row}
                nowMs={nowMs}
                anchor={rowAnchor(row, seenHosts)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted text-sm">
            Nothing in this response is unhealthy, unknown, or stale.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-ink text-sm font-medium">Checked in within the last day</h3>
        <p className="text-ink-muted text-sm">
          {current.length.toLocaleString()} checks with a healthy checkpoint from the last day.
        </p>
        {current.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {current.map((row) => (
              <li
                key={row.relay}
                id={rowAnchor(row, seenHosts)}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1"
              >
                <RelayLink host={row.host} label={relayDisplayLabel(row.relay, row.host)} />
                <span
                  className="text-ink-faint text-xs"
                  title={String(row.latestCheckpointAt ?? row.lastSeenAt ?? "")}
                >
                  {checkpointText(row, nowMs)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
