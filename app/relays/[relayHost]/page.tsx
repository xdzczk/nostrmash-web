import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  extractRelayHealthRows,
  normalizeRelayHost,
  rankRelayActivity,
  readMetricNumber,
  selectRelayHealthForHost,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData, readStatsSections } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { WindowSelector } from "@/components/explorer/window-selector";
import { RelayLink } from "@/components/relays/relay-link";
import { RelaySummaryCard } from "@/components/relays/relay-summary-card";
import { SectionCard } from "@/components/ui/section-card";
import { LoadErrors } from "@/components/ui/status-panels";
import {
  getPopularRelays,
  getRelayHealth,
  getRelayProbeHealth,
  getRelayStats,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { displayProbeStatus, probeStatusLabel } from "@/lib/relays/probe-status";
import { getRequestNowMs } from "@/lib/time/request-now";
import { isValidRelayHostParam, normalizeValidatedRelayHost } from "@/lib/routing/params";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import { formatStatsWindowLabel, readStatsWindow } from "@/lib/search-params/window";
import { buildEntityMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ relayHost: string }>;

function relayWebsocketUrl(relay: string | undefined, host: string): string {
  if (relay && /^wss?:\/\//i.test(relay.trim())) return relay.trim();
  return `wss://${host}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { relayHost } = await params;
  const label = normalizeValidatedRelayHost(relayHost) ?? relayHost;
  return buildEntityMetadata({
    title: label,
    description: `Indexed rank, listed rank, and current status for the Nostr relay ${label}.`,
    path: `/relays/${encodeURIComponent(label)}`,
  });
}

export default async function RelayPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { relayHost } = await params;
  const resolvedSearchParams = await searchParams;
  const window = readStatsWindow(resolvedSearchParams);
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  if (!isValidRelayHostParam(relayHost)) {
    notFound();
  }
  const normalizedRelayHost =
    normalizeValidatedRelayHost(relayHost) ||
    normalizeRelayHost(relayHost) ||
    relayHost.toLowerCase();
  const errors: string[] = [];
  let payload: Awaited<ReturnType<typeof getRelayStats>> | null = null;
  let healthPayload: Awaited<ReturnType<typeof getRelayHealth>> | null = null;
  let popular: Awaited<ReturnType<typeof getPopularRelays>> | null = null;
  let probes: Awaited<ReturnType<typeof getRelayProbeHealth>> | null = null;

  const [statsResult, healthResult, popularResult, probeResult] = await Promise.allSettled([
    getRelayStats("shortTtl", window),
    getRelayHealth("shortTtl"),
    getPopularRelays("shortTtl", { limit: 100 }),
    getRelayProbeHealth("shortTtl", { limit: 200 }),
  ]);
  if (statsResult.status === "fulfilled") {
    payload = statsResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(statsResult.reason, "Failed to load relay stats."));
  }
  if (healthResult.status === "fulfilled") {
    healthPayload = healthResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(healthResult.reason, "Failed to load relay health."));
  }
  if (popularResult.status === "fulfilled") {
    popular = popularResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(popularResult.reason, "Failed to load listed relays."));
  }
  if (probeResult.status === "fulfilled") {
    probes = probeResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(probeResult.reason, "Failed to load connection checks."));
  }

  const rankedActivity = rankRelayActivity(payload, 200, window);
  const relayActivity = rankedActivity.find((entry) => entry.host === normalizedRelayHost) ?? null;
  const relayEntry = relayActivity?.metrics ?? null;
  const neighboringRelays = relayActivity
    ? rankedActivity.filter(
        (entry) =>
          entry.host !== normalizedRelayHost && Math.abs(entry.rank - relayActivity.rank) <= 3
      )
    : rankedActivity.slice(0, 5);
  const activityTotal = rankedActivity.reduce((sum, entry) => sum + entry.activityScore, 0);
  const activityShare =
    relayActivity && activityTotal > 0
      ? ((relayActivity.activityScore / activityTotal) * 100).toFixed(1)
      : null;
  const events = relayEntry ? readMetricNumber(relayEntry, "event_count", "events") : null;
  const authors = relayEntry ? readMetricNumber(relayEntry, "unique_authors") : null;

  const healthRows = extractRelayHealthRows(healthPayload);
  const nowMs = getRequestNowMs();
  const selectedHealth = selectRelayHealthForHost(healthRows, normalizedRelayHost, nowMs);
  const relayHealth = selectedHealth.row;
  const healthy =
    relayHealth?.healthy === true ? true : relayHealth?.healthy === false ? false : null;
  const semantics = extractNativeApiSemantics(payload, healthPayload);

  const listedIndex =
    popular?.relays.findIndex(
      (relay) => normalizeRelayHost(relay.normalized_url) === normalizedRelayHost
    ) ?? -1;
  const listed = listedIndex >= 0 ? popular?.relays[listedIndex] : undefined;
  const probe =
    probes?.relays.find(
      (relay) => normalizeRelayHost(relay.normalized_url) === normalizedRelayHost
    ) ?? null;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Relay"
        title={normalizedRelayHost}
        subtitle={`Indexed rank, who lists it, and whether we could read it over ${formatStatsWindowLabel(window).toLowerCase()}.`}
        badges={
          <WindowSelector
            path={`/relays/${encodeURIComponent(normalizedRelayHost)}`}
            searchParams={currentSearchParams}
            activeWindow={window}
          />
        }
      />
      <NetworkNav />

      <LoadErrors errors={errors} />

      <RelaySummaryCard
        host={normalizedRelayHost}
        rank={relayActivity?.rank ?? null}
        sharePercent={activityShare}
        events={events ?? relayActivity?.activityScore ?? null}
        authors={authors}
        listedRank={listed ? listedIndex + 1 : null}
        listedUsers={listed?.distinct_users ?? null}
        listedKnown={popular !== null}
        healthy={relayHealth ? healthy : null}
        checkpointAt={relayHealth?.latestCheckpointAt ?? relayHealth?.lastSeenAt}
        lastError={relayHealth?.lastError}
        observationCount={selectedHealth.count}
        connectLabel={probe ? probeStatusLabel(displayProbeStatus(probe)) : null}
        connectLatencyMs={probe?.avg_connect_latency_ms}
        relayUrl={relayWebsocketUrl(relayHealth?.relay, normalizedRelayHost)}
        window={window}
      />

      <SectionCard
        title={relayActivity ? "Adjacent in this ranking" : "Highest volume relays"}
        description={
          relayActivity
            ? "Relays within three ranks of this one, by indexed event volume."
            : "This host is outside the current ranking. These are the relays at the top of it."
        }
      >
        {neighboringRelays.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {neighboringRelays.map((entry) => (
              <li key={entry.host} className="py-2">
                <RelayLink host={entry.host} rank={entry.rank} window={window} />
                <p className="text-ink-muted text-sm">
                  {entry.activityScore.toLocaleString()} events
                  {activityTotal > 0
                    ? ` · ${((entry.activityScore / activityTotal) * 100).toFixed(1)}% of this ranking`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No other relay rows were found in this response." />
        )}
      </SectionCard>

      <DebugDisclosure title="Debug payload: relay stats aggregate" data={payload ?? {}} />
      <AboutThisData semantics={semantics} sections={readStatsSections(payload)}>
        Activity rank uses indexed event volume for {formatStatsWindowLabel(window).toLowerCase()}.
        This page is the hostname, so every URL on that host is listed here. Ingest is the
        checkpoint the status page lists first. The connection check is the latest probe for this
        host.
      </AboutThisData>
      <DebugDisclosure title="Debug payload: relay health" data={healthPayload ?? {}} />
    </div>
  );
}
