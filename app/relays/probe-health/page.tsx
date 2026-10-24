import type { Metadata } from "next";

import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { RelayLink } from "@/components/relays/relay-link";
import { StatusPill } from "@/components/relays/status-pill";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getRelayProbeHealth } from "@/lib/api/endpoints";
import {
  displayProbeStatus,
  probeNeedsAttention,
  recordedProbeStatus,
} from "@/lib/relays/probe-status";
import type { RelayProbeHealthEntry } from "@/lib/types/api";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { formatRelativeAge } from "@/lib/time/freshness";

export const metadata: Metadata = {
  title: "Relay probe health",
  description: "Health probe results for monitored Nostr relays.",
};

function checkLabel(ok: boolean | undefined): string {
  if (ok === true) return "ok";
  if (ok === false) return "fail";
  return "—";
}

function checkClass(ok: boolean | undefined): string {
  if (ok === true) return "text-success-ink";
  if (ok === false) return "text-danger-ink";
  return "text-ink-faint";
}

function formatLatency(ms: number | undefined): string {
  if (ms === undefined || ms === null) return "n/a";
  return `${ms.toFixed(0)}ms`;
}

function formatFailRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function admissionTone(state: string): "ok" | "bad" | "warn" | "neutral" {
  if (state === "active" || state === "pinned") return "ok";
  if (state === "blocked") return "bad";
  if (state === "probation" || state === "draining") return "warn";
  return "neutral";
}

function sortRelays(relays: RelayProbeHealthEntry[]): RelayProbeHealthEntry[] {
  return [...relays].sort((left, right) => {
    const leftFail = probeNeedsAttention(left) ? 0 : 1;
    const rightFail = probeNeedsAttention(right) ? 0 : 1;
    if (leftFail !== rightFail) return leftFail - rightFail;
    if (left.probe_fail_rate !== right.probe_fail_rate) {
      return right.probe_fail_rate - left.probe_fail_rate;
    }
    return left.normalized_url.localeCompare(right.normalized_url);
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
  const failing = relays.filter((relay) => probeNeedsAttention(relay)).length;
  const avgFailRate =
    relays.length > 0
      ? relays.reduce((sum, relay) => sum + relay.probe_fail_rate, 0) / relays.length
      : 0;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Relay monitoring"
        title="Relay probe health"
        subtitle="A direct check of whether each relay accepts a connection. Failures are listed first. Admission is a separate registry state, not the probe result."
      />
      <NetworkNav active="probes" />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard
        title="Probe results"
        description={
          relays.length > 0
            ? `${failing.toLocaleString()} of ${relays.length.toLocaleString()} are failing the latest checks. Mean fail rate is ${formatFailRate(avgFailRate)}, the average of each relay's own rate, not the share that are down right now.`
            : "Latest check of websocket connect, subscribe, and end-of-stored-events."
        }
      >
        {relays.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {relays.map((relay) => {
              const host = normalizeRelayHost(relay.normalized_url);
              const status = displayProbeStatus(relay);
              const recorded = recordedProbeStatus(relay);
              const probed = formatRelativeAge(relay.last_probe_at);
              return (
                <li key={relay.normalized_url} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    {host ? (
                      <RelayLink host={host} />
                    ) : (
                      <p className="text-ink min-h-11 text-sm">{relay.normalized_url}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={status === "ok" ? "ok" : "bad"}>{status}</StatusPill>
                      <StatusPill tone={admissionTone(relay.admission_state)}>
                        Admission {relay.admission_state}
                      </StatusPill>
                    </div>
                  </div>
                  <p className="text-ink-faint mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>
                      Connect{" "}
                      <span className={checkClass(relay.last_connect_ok)}>
                        {checkLabel(relay.last_connect_ok)}
                      </span>
                    </span>
                    <span>
                      Subscribe{" "}
                      <span className={checkClass(relay.last_subscribe_ok)}>
                        {checkLabel(relay.last_subscribe_ok)}
                      </span>
                    </span>
                    <span>
                      End of events{" "}
                      <span className={checkClass(relay.last_eose_ok)}>
                        {checkLabel(relay.last_eose_ok)}
                      </span>
                    </span>
                    <span>
                      Latency {formatLatency(relay.avg_connect_latency_ms)}
                      {relay.avg_eose_latency_ms !== undefined
                        ? ` / end ${formatLatency(relay.avg_eose_latency_ms)}`
                        : ""}
                    </span>
                    <span>Fail rate {formatFailRate(relay.probe_fail_rate)}</span>
                    <span>Last probed {probed ?? "never"}</span>
                  </p>
                  {recorded ? (
                    <p className="text-warning-ink mt-1 text-xs">
                      Recorded status was {recorded}, which does not match these checks.
                    </p>
                  ) : null}
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
