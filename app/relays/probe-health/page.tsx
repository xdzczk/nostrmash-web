import Link from "next/link";
import type { Metadata } from "next";

import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { StatCard } from "@/components/explorer/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getRelayProbeHealth } from "@/lib/api/endpoints";
import type { RelayProbeHealthEntry } from "@/lib/types/api";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Relay probe health",
  description: "Health probe results for monitored Nostr relays.",
};

function probeStatusBadge(status: string | undefined) {
  if (!status) return null;
  const colors: Record<string, string> = {
    ok: "border-success/50 text-success-ink",
    connect_failed: "border-danger/50 text-danger-ink",
    subscribe_failed: "border-warning/50 text-warning-ink",
    eose_timeout: "border-warning/50 text-warning-ink",
    protocol_error: "border-danger/50 text-danger-ink",
    rate_limited: "border-warning/45 text-warning-ink",
    unknown_error: "border-edge-strong text-ink-muted",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] ${colors[status] ?? "border-edge-strong text-ink-muted"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function admissionBadge(state: string) {
  const colors: Record<string, string> = {
    active: "border-success/50 text-success-ink",
    pinned: "border-accent-sky/50 text-accent-sky-ink",
    probation: "border-warning/50 text-warning-ink",
    candidate: "border-edge-strong text-ink-muted",
    inactive: "border-edge-strong text-ink-faint",
    blocked: "border-danger/50 text-danger-ink",
    draining: "border-warning/45 text-warning-ink",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] ${colors[state] ?? "border-edge-strong text-ink-muted"}`}
    >
      {state}
    </span>
  );
}

function formatLatency(ms: number | undefined): string {
  if (ms === undefined || ms === null) return "n/a";
  return `${ms.toFixed(0)}ms`;
}

function formatFailRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatTimeAgo(isoString: string | undefined): string {
  if (!isoString) return "never";
  const date = new Date(isoString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function sortRelays(relays: RelayProbeHealthEntry[]): RelayProbeHealthEntry[] {
  return [...relays].sort((a, b) => {
    const statusOrder = (s: string | undefined) =>
      s === "ok" ? 0 : s === "eose_timeout" ? 1 : s === undefined ? 3 : 2;
    const sa = statusOrder(a.last_probe_status);
    const sb = statusOrder(b.last_probe_status);
    if (sa !== sb) return sa - sb;
    return a.normalized_url.localeCompare(b.normalized_url);
  });
}

export default async function RelayProbeHealthPage() {
  let errorMessage = "";
  let data: Awaited<ReturnType<typeof getRelayProbeHealth>> | null = null;

  try {
    data = await getRelayProbeHealth("shortTtl", { limit: 200 });
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Failed to load probe health.");
  }

  const relays = sortRelays(data?.relays ?? []);
  const healthy = relays.filter((r) => r.last_probe_status === "ok").length;
  const failing = relays.filter(
    (r) => r.last_probe_status !== undefined && r.last_probe_status !== "ok"
  ).length;
  const avgFailRate =
    relays.length > 0 ? relays.reduce((sum, r) => sum + r.probe_fail_rate, 0) / relays.length : 0;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Relay monitoring"
        title="Relay probe health"
        subtitle="Health probe results from automated monitoring of Nostr relays. Probes test websocket connectivity, NIP-01 subscription, and EOSE delivery."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              probed relays: {relays.length.toLocaleString()}
            </span>
            <span className="border-success/45 text-success-ink rounded-full border px-2 py-1">
              healthy: {healthy.toLocaleString()}
            </span>
            <span className="border-danger/45 text-danger-ink rounded-full border px-2 py-1">
              failing: {failing.toLocaleString()}
            </span>
            <Link
              href="/relays"
              className="border-edge-strong hover:border-accent-soft/40 text-link rounded-full border px-2 py-1"
            >
              Back to relay explorer
            </Link>
          </div>
        }
      />
      <NetworkNav active="health" />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="probed relays" value={relays.length} />
        <StatCard label="healthy (ok)" value={healthy} />
        <StatCard label="failing" value={failing} />
        <StatCard label="avg fail rate" value={formatFailRate(avgFailRate)} />
      </section>

      <SectionCard
        title="Probe results"
        description="Latest health probe outcomes. Each relay is tested for websocket connect, subscribe, and EOSE delivery."
      >
        {relays.length > 0 ? (
          <ul className="space-y-2">
            {relays.map((relay) => {
              const host = normalizeRelayHost(relay.normalized_url);
              return (
                <li
                  key={relay.normalized_url}
                  className="hover:bg-surface/40 rounded-lg p-3 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-ink truncate text-sm">{relay.normalized_url}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {probeStatusBadge(relay.last_probe_status)}
                      {admissionBadge(relay.admission_state)}
                      {host ? (
                        <Link
                          href={`/relays/${encodeURIComponent(host)}`}
                          className="border-edge-strong hover:border-accent-soft/40 text-link rounded-full border px-3 py-1"
                        >
                          Open relay
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-ink-faint mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                    <span>
                      connect:{" "}
                      <span
                        className={relay.last_connect_ok ? "text-success-ink" : "text-danger-ink"}
                      >
                        {relay.last_connect_ok
                          ? "ok"
                          : relay.last_connect_ok === false
                            ? "fail"
                            : "—"}
                      </span>
                    </span>
                    <span>
                      subscribe:{" "}
                      <span
                        className={relay.last_subscribe_ok ? "text-success-ink" : "text-danger-ink"}
                      >
                        {relay.last_subscribe_ok
                          ? "ok"
                          : relay.last_subscribe_ok === false
                            ? "fail"
                            : "—"}
                      </span>
                    </span>
                    <span>
                      EOSE:{" "}
                      <span className={relay.last_eose_ok ? "text-success-ink" : "text-danger-ink"}>
                        {relay.last_eose_ok ? "ok" : relay.last_eose_ok === false ? "fail" : "—"}
                      </span>
                    </span>
                    <span>
                      latency: {formatLatency(relay.avg_connect_latency_ms)}
                      {relay.avg_eose_latency_ms !== undefined
                        ? ` / EOSE ${formatLatency(relay.avg_eose_latency_ms)}`
                        : ""}
                    </span>
                    <span>fail rate: {formatFailRate(relay.probe_fail_rate)}</span>
                    <span>last probed: {formatTimeAgo(relay.last_probe_at)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="No probe data"
            message="No relay probe observations were returned. The relay registry may not be enabled or probing has not started yet."
          />
        )}
      </SectionCard>
    </div>
  );
}
