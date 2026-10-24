import Link from "next/link";
import type { Metadata } from "next";

import {
  extractRelayHealthRows,
  formatRelayHealthSummary,
  rankRelayActivity,
  readMetricNumber,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData, readStatsSections } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { WindowSelector } from "@/components/explorer/window-selector";
import { IndexedAt } from "@/components/freshness/indexed-at";
import { RelayLink, relaySearchHref } from "@/components/relays/relay-link";
import { ShareBar } from "@/components/relays/share-bar";
import { StatusPill } from "@/components/relays/status-pill";
import { SectionCard } from "@/components/ui/section-card";
import { LoadErrors, SoftRefreshNote } from "@/components/ui/status-panels";
import { getRelayHealth, getRelayStats } from "@/lib/api/endpoints";
import { getStaleDataNotice } from "@/lib/api/http";
import { getRequestNowMs } from "@/lib/time/request-now";
import { readSearchParam, toUrlSearchParams } from "@/lib/search-params/pagination";
import { formatStatsWindowLabel, readStatsWindow } from "@/lib/search-params/window";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Network",
  description: "Understand Nostr relay activity, reach, and current network health.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RelaysPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const window = readStatsWindow(resolvedSearchParams);
  const healthCursor = readSearchParam(resolvedSearchParams, "health_cursor");
  const errors: string[] = [];
  let relayStats: Awaited<ReturnType<typeof getRelayStats>> | null = null;
  let relayHealth: Awaited<ReturnType<typeof getRelayHealth>> | null = null;

  const [statsResult, healthResult] = await Promise.allSettled([
    getRelayStats("shortTtl", window),
    getRelayHealth("shortTtl", { cursor: healthCursor }),
  ]);
  if (statsResult.status === "fulfilled") {
    relayStats = statsResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(statsResult.reason, "Relay stats failed."));
  }
  if (healthResult.status === "fulfilled") {
    relayHealth = healthResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(healthResult.reason, "Relay health failed."));
  }
  const staleNotice = getStaleDataNotice();

  const rankedRelays = rankRelayActivity(relayStats, 40, window);
  const healthRows = extractRelayHealthRows(relayHealth);
  const nowMs = getRequestNowMs();
  const healthTotal =
    typeof relayHealth?.total === "number" ? relayHealth.total : healthRows.length;
  const healthSummary = formatRelayHealthSummary(healthRows, nowMs, healthTotal);
  const healthByHost = new Map<string, (typeof healthRows)[number]>();
  for (const row of healthRows) {
    const existing = healthByHost.get(row.host);
    if (!existing || (existing.healthy !== false && row.healthy === false)) {
      healthByHost.set(row.host, row);
    }
  }
  const semantics = extractNativeApiSemantics(relayStats, relayHealth);
  const totalActivity = rankedRelays.reduce((sum, row) => sum + row.activityScore, 0);
  const headCount = Math.min(3, rankedRelays.length);
  const headActivity = rankedRelays
    .slice(0, headCount)
    .reduce((sum, row) => sum + row.activityScore, 0);
  const headShare = totalActivity > 0 ? Math.round((headActivity / totalActivity) * 100) : 0;
  const leaderScore = rankedRelays[0]?.activityScore ?? 0;
  const healthSampleNote =
    typeof relayHealth?.next_cursor === "string" && relayHealth.next_cursor.length > 0
      ? " This is the latest page of health results, not every relay."
      : "";

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Network intelligence"
        title="The network behind the conversation."
        subtitle="Where indexed events concentrate, and which relays are failing their checks."
        badges={
          <WindowSelector path="/relays" searchParams={currentSearchParams} activeWindow={window} />
        }
      />
      <NetworkNav active="overview" />
      <IndexedAt computedAt={semantics.computed_at} label="Stats updated" />

      {staleNotice ? <SoftRefreshNote message={staleNotice} /> : null}
      <LoadErrors errors={errors} />

      {healthRows.length === 0 ? (
        <p className="text-ink-muted text-sm">
          Health checks are unavailable right now. The ranking below still shows where indexed
          events concentrate.
        </p>
      ) : (
        <p className="text-ink-muted max-w-3xl text-sm leading-6">
          {healthSummary}
          {healthSampleNote}{" "}
          <Link href="/relays/health" className="nm-action-link">
            Open health
          </Link>
        </p>
      )}

      <SectionCard
        title="Dominant relay activity"
        description={
          rankedRelays.length > 0
            ? `The top ${headCount} carry ${headShare}% of indexed events in this ${formatStatsWindowLabel(window).toLowerCase()} ranking. Bar length is compared with the leader.`
            : "Relays carrying the most indexed events."
        }
      >
        {rankedRelays.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {rankedRelays.slice(0, 20).map((row) => {
              const health = healthByHost.get(row.host);
              const share =
                totalActivity > 0 ? ((row.activityScore / totalActivity) * 100).toFixed(1) : "0.0";
              const events =
                readMetricNumber(row.metrics, "event_count", "events") ?? row.activityScore;
              const authors = readMetricNumber(row.metrics, "unique_authors");
              return (
                <li key={row.host} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <RelayLink host={row.host} rank={row.rank} window={window} />
                    <div className="flex items-center gap-3">
                      {health?.healthy === false ? (
                        <StatusPill tone="bad">Unhealthy</StatusPill>
                      ) : null}
                      <Link href={relaySearchHref(row.host)} className="nm-action-link">
                        Search mentions
                      </Link>
                    </div>
                  </div>
                  <p className="text-ink-faint text-xs">
                    {share}% of this ranking · {events.toLocaleString()} events
                    {authors !== null
                      ? ` · ${authors.toLocaleString()} pubkeys seen on relays`
                      : ""}
                  </p>
                  <ShareBar
                    value={row.activityScore}
                    max={leaderScore}
                    label={`${row.host} compared with the leading relay`}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState message="Relay activity rankings will appear here once the index has gathered enough relay stats to rank." />
        )}
      </SectionCard>

      <DebugDisclosure title="Debug payload: relay stats" data={relayStats ?? {}} />
      <AboutThisData semantics={semantics} sections={readStatsSections(relayStats)}>
        Ranked by indexed event volume for {formatStatsWindowLabel(window).toLowerCase()}. Share is
        within this ranking, not the whole public network. Health counts come from a separate check
        and can list relays that do not appear here.
      </AboutThisData>
      <DebugDisclosure title="Debug payload: relay health" data={relayHealth ?? {}} />
    </div>
  );
}
