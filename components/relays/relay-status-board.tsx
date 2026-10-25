import { normalizeRelayHost, relayDisplayLabel } from "@/components/explorer/stats-utils";
import type { RelayHealthSummary } from "@/components/explorer/stats-utils";
import { RelayLink } from "@/components/relays/relay-link";
import { StatusPill } from "@/components/relays/status-pill";
import { Disclosure } from "@/components/ui/disclosure";
import { groupRelayAttention } from "@/lib/relays/ingest-errors";
import { indexMembershipNote } from "@/lib/relays/index-membership";
import {
  displayProbeStatus,
  probeNeedsAttention,
  probeStatusLabel,
  recordedProbeStatus,
} from "@/lib/relays/probe-status";
import type { RelayProbeHealthEntry } from "@/lib/types/api";
import { formatRelativeAge } from "@/lib/time/freshness";

function checkpointText(row: RelayHealthSummary, nowMs: number): string {
  const age = formatRelativeAge(row.latestCheckpointAt ?? row.lastSeenAt, nowMs);
  return age ? `Checkpoint ${age}` : "No checkpoint";
}

function rowAnchor(row: RelayHealthSummary, seenHosts: Set<string>): string | undefined {
  if (seenHosts.has(row.host)) return undefined;
  seenHosts.add(row.host);
  return `relay-${encodeURIComponent(row.host)}`;
}

function formatLatency(ms: number | undefined): string | null {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) return null;
  return `${ms.toFixed(0)}ms`;
}

function IngestRow({
  row,
  nowMs,
  anchor,
  probe,
}: {
  row: RelayHealthSummary;
  nowMs: number;
  anchor?: string;
  probe?: RelayProbeHealthEntry;
}) {
  const connect = probe ? probeStatusLabel(displayProbeStatus(probe)) : null;
  const latency = probe ? formatLatency(probe.avg_connect_latency_ms) : null;

  return (
    <li id={anchor} className="py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <RelayLink host={row.host} label={relayDisplayLabel(row.relay, row.host)} />
        <span className="text-ink-muted text-sm">{checkpointText(row, nowMs)}</span>
      </div>
      {connect ? (
        <p className="text-ink-muted mt-0.5 text-sm">
          {connect}
          {latency ? ` · ${latency}` : ""}
        </p>
      ) : null}
      {row.lastError ? (
        <Disclosure title="Technical detail" className="mt-2">
          <p className="text-ink-muted font-mono text-xs break-all">{row.lastError}</p>
        </Disclosure>
      ) : null}
    </li>
  );
}

function ConnectRow({ relay, nowMs }: { relay: RelayProbeHealthEntry; nowMs: number }) {
  const host = normalizeRelayHost(relay.normalized_url);
  const status = displayProbeStatus(relay);
  const failing = probeNeedsAttention(relay);
  const recorded = recordedProbeStatus(relay);
  const membership = indexMembershipNote(relay.admission_state, true);
  const latency = formatLatency(relay.avg_connect_latency_ms);
  const probed = formatRelativeAge(relay.last_probe_at, nowMs);

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {host ? (
          <RelayLink host={host} />
        ) : (
          <p className="text-ink text-sm">{relay.normalized_url}</p>
        )}
        <StatusPill tone={failing ? "bad" : "ok"}>{probeStatusLabel(status)}</StatusPill>
      </div>
      <p className="text-ink-muted mt-0.5 text-sm">
        {latency ? `${latency} · ` : ""}
        {probed ? `Probed ${probed}` : "Not probed"}
        {membership ? ` · ${membership}` : ""}
      </p>
      {recorded || relay.probe_fail_rate > 0 ? (
        <Disclosure title="Earlier checks" className="mt-2">
          <p className="text-ink-muted text-sm">
            {recorded ? `An earlier record said ${recorded}. ` : ""}
            Historical fail rate {(relay.probe_fail_rate * 100).toFixed(1)}%.
          </p>
        </Disclosure>
      ) : null}
    </li>
  );
}

export function RelayStatusBoard({
  rows,
  nowMs,
  probes,
  probeTotal,
}: {
  rows: RelayHealthSummary[];
  nowMs: number;
  probes: RelayProbeHealthEntry[];
  probeTotal: number;
}) {
  const { fresh, groups } = groupRelayAttention(rows, nowMs);
  const probesByHost = new Map<string, RelayProbeHealthEntry>();
  for (const probe of probes) {
    const host = normalizeRelayHost(probe.normalized_url);
    if (!host) continue;
    const existing = probesByHost.get(host);
    if (!existing || (probeNeedsAttention(probe) && !probeNeedsAttention(existing))) {
      probesByHost.set(host, probe);
    }
  }
  const seenHosts = new Set<string>();
  const failingProbes = probes.filter((probe) => probeNeedsAttention(probe));
  const connected = probes.length - failingProbes.length;

  return (
    <div className="space-y-10">
      <section id="fresh" className="scroll-mt-24 space-y-2">
        <h2 className="nm-title text-ink">Checked in today</h2>
        <p className="text-ink-muted max-w-3xl text-sm leading-6">
          {fresh.length.toLocaleString()} relays with a healthy ingest checkpoint in the last day.
          {probes.length > 0 ? " Connection is the latest direct check, when we have one." : ""}
        </p>
        {fresh.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {fresh.map((row) => (
              <IngestRow
                key={row.relay}
                row={row}
                nowMs={nowMs}
                anchor={rowAnchor(row, seenHosts)}
                probe={probesByHost.get(row.host)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted text-sm">No relay checked in healthy within the last day.</p>
        )}
      </section>

      <section id="failing" className="scroll-mt-24 space-y-3">
        <h2 className="nm-title text-ink">Needs a look</h2>
        <p className="text-ink-muted max-w-3xl text-sm leading-6">
          Failures are grouped by what went wrong. The raw check is inside each row.
        </p>
        {groups.length > 0 ? (
          groups.map((group) => (
            <Disclosure
              key={group.id}
              id={group.id === "stale" ? "stale" : undefined}
              title={`${group.label} · ${group.rows.length.toLocaleString()}`}
              description={group.summary}
            >
              <ul className="divide-edge/70 divide-y">
                {group.rows.map((row) => (
                  <IngestRow
                    key={row.relay}
                    row={row}
                    nowMs={nowMs}
                    anchor={rowAnchor(row, seenHosts)}
                    probe={probesByHost.get(row.host)}
                  />
                ))}
              </ul>
            </Disclosure>
          ))
        ) : (
          <p className="text-ink-muted text-sm">Nothing in this response is unhealthy or stale.</p>
        )}
      </section>

      <section id="connect" className="border-edge/70 scroll-mt-24 space-y-3 border-t pt-8">
        <h2 className="nm-title text-ink">Connection checks</h2>
        <p className="text-ink-muted max-w-3xl text-sm leading-6">
          {probes.length === 0
            ? "Connection checks are unavailable right now."
            : `${failingProbes.length.toLocaleString()} of ${probes.length.toLocaleString()} shown are failing the latest connection check.${
                probeTotal !== probes.length
                  ? ` ${probeTotal.toLocaleString()} relays have been probed.`
                  : ""
              } ${connected.toLocaleString()} of the relays shown accepted a connection. Whether a relay is in our index is separate from that check.`}
        </p>
        {probes.length === 0 ? null : failingProbes.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {failingProbes.map((relay) => (
              <ConnectRow key={relay.normalized_url} relay={relay} nowMs={nowMs} />
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted text-sm">None of the relays shown are failing.</p>
        )}
        {connected > 0 ? (
          <Disclosure
            title={`Connected · ${connected.toLocaleString()}`}
            description="Relays whose latest check could connect, subscribe, and finish reading."
          >
            <ul className="divide-edge/70 divide-y">
              {probes
                .filter((relay) => !probeNeedsAttention(relay))
                .map((relay) => (
                  <ConnectRow key={relay.normalized_url} relay={relay} nowMs={nowMs} />
                ))}
            </ul>
          </Disclosure>
        ) : null}
      </section>
    </div>
  );
}
