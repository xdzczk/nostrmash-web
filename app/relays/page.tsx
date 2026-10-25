import Link from "next/link";
import type { Metadata } from "next";

import {
  extractRelayHealthRows,
  normalizeRelayHost,
  rankRelayActivity,
  readMetricNumber,
  relayHealthSummary,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData, readStatsSections } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { WindowSelector } from "@/components/explorer/window-selector";
import { IndexedAt } from "@/components/freshness/indexed-at";
import { CheckComposition } from "@/components/relays/check-composition";
import { RelayRankRow } from "@/components/relays/relay-rank-row";
import { SectionCard } from "@/components/ui/section-card";
import { LoadErrors, SoftRefreshNote } from "@/components/ui/status-panels";
import { getPopularRelays, getRelayHealth, getRelayStats } from "@/lib/api/endpoints";
import { getStaleDataNotice } from "@/lib/api/http";
import { getRequestNowMs } from "@/lib/time/request-now";
import { readSearchParam, toUrlSearchParams } from "@/lib/search-params/pagination";
import { formatStatsWindowLabel, readStatsWindow } from "@/lib/search-params/window";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { concentrationTitle } from "@/lib/relays/concentration";
import { indexMembershipNote } from "@/lib/relays/index-membership";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Network",
  description: "Where indexed Nostr events concentrate, and which relays are current.",
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
  let popular: Awaited<ReturnType<typeof getPopularRelays>> | null = null;

  const [statsResult, healthResult, popularResult] = await Promise.allSettled([
    getRelayStats("shortTtl", window),
    getRelayHealth("shortTtl", { cursor: healthCursor }),
    getPopularRelays("shortTtl", { limit: 100 }),
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
  if (popularResult.status === "fulfilled") {
    popular = popularResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(popularResult.reason, "Popular relays failed."));
  }
  const staleNotice = getStaleDataNotice();

  const rankedRelays = rankRelayActivity(relayStats, 40, window);
  const nowMs = getRequestNowMs();
  const healthRows = extractRelayHealthRows(relayHealth);
  const health = relayHealthSummary(healthRows, nowMs);
  const semantics = extractNativeApiSemantics(relayStats, relayHealth);
  const totalActivity = rankedRelays.reduce((sum, row) => sum + row.activityScore, 0);
  const headCount = Math.min(3, rankedRelays.length);
  const headActivity = rankedRelays
    .slice(0, headCount)
    .reduce((sum, row) => sum + row.activityScore, 0);
  const headShare = totalActivity > 0 ? Math.round((headActivity / totalActivity) * 100) : 0;
  const leaderScore = rankedRelays[0]?.activityScore ?? 0;
  const healthIsPartial =
    typeof relayHealth?.next_cursor === "string" && relayHealth.next_cursor.length > 0;

  const listed = (popular?.relays ?? [])
    .map((relay, index) => ({
      relay,
      host: normalizeRelayHost(relay.normalized_url),
      rank: index + 1,
    }))
    .filter((entry) => entry.host.length > 0);
  const listedByHost = new Map(listed.map((entry) => [entry.host, entry]));
  const indexedByHost = new Map(rankedRelays.map((row) => [row.host, row]));
  const listedTotal = typeof popular?.total === "number" ? popular.total : listed.length;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Network"
        title={concentrationTitle(headCount, headShare, window)}
        subtitle="Indexed volume beside the relays people list, and whether those checks are current."
        badges={
          <WindowSelector path="/relays" searchParams={currentSearchParams} activeWindow={window} />
        }
      />
      <NetworkNav active="overview" />
      <IndexedAt computedAt={semantics.computed_at} label="Stats updated" />

      {staleNotice ? <SoftRefreshNote message={staleNotice} /> : null}
      <LoadErrors errors={errors} />

      {health.checks > 0 ? (
        <section className="space-y-3">
          <CheckComposition
            fresh={health.current.length}
            stale={health.stale}
            failing={health.posture.unhealthy}
            unknown={health.posture.unknown}
            hosts={health.hosts}
          />
          <p className="text-ink-muted text-sm">
            {healthIsPartial ? "This is the latest page of health results, not every relay. " : ""}
            <Link href="/relays/health" className="nm-action-link">
              Open status
            </Link>
          </p>
        </section>
      ) : (
        <p className="text-ink-muted text-sm">
          Health checks are unavailable right now. The ranking below still shows where indexed
          events concentrate.
        </p>
      )}

      <div className="grid gap-x-12 lg:grid-cols-2">
        <SectionCard
          title="Indexed"
          description={
            rankedRelays.length > 0
              ? `Share of indexed events in this ${formatStatsWindowLabel(window).toLowerCase()} ranking. The bar matches the leader.`
              : "Relays carrying the most indexed events."
          }
        >
          {rankedRelays.length > 0 ? (
            <ul className="divide-edge/70 divide-y">
              {rankedRelays.slice(0, 10).map((row) => {
                const share =
                  totalActivity > 0
                    ? ((row.activityScore / totalActivity) * 100).toFixed(1)
                    : "0.0";
                const events =
                  readMetricNumber(row.metrics, "event_count", "events") ?? row.activityScore;
                const authors = readMetricNumber(row.metrics, "unique_authors");
                const listedRank = listedByHost.get(row.host)?.rank ?? null;
                const detail = [
                  `${events.toLocaleString()} events`,
                  authors !== null ? `${authors.toLocaleString()} authors` : null,
                  listedRank !== null ? `Listed #${listedRank}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <RelayRankRow
                    key={row.host}
                    host={row.host}
                    rank={row.rank}
                    window={window}
                    value={`${share}%`}
                    detail={detail}
                    bar={{
                      value: row.activityScore,
                      max: leaderScore,
                      label: `${row.host} compared with the leading relay`,
                    }}
                  />
                );
              })}
            </ul>
          ) : (
            <EmptyState message="Relay activity rankings will appear here once the index has gathered enough relay stats to rank." />
          )}
        </SectionCard>

        <SectionCard
          title="Listed by people"
          description={
            listed.length > 0
              ? `${listedTotal.toLocaleString()} relays appear in a public relay list. Someone who lists several is counted on each one.`
              : "Relays ranked by how many people include them in a public relay list."
          }
        >
          {listed.length > 0 ? (
            <ul className="divide-edge/70 divide-y">
              {listed.slice(0, 8).map((entry) => {
                const indexed = indexedByHost.get(entry.host);
                const membership = indexMembershipNote(
                  entry.relay.admission_state,
                  entry.relay.in_registry
                );
                const detail = [
                  "people list this relay",
                  indexed ? `Indexed #${indexed.rank}` : "Not in this indexed ranking",
                  membership,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <RelayRankRow
                    key={entry.relay.normalized_url}
                    host={entry.host}
                    rank={entry.rank}
                    window={window}
                    value={entry.relay.distinct_users.toLocaleString()}
                    detail={detail}
                    bar={{
                      value: entry.relay.distinct_users,
                      max: listed[0]?.relay.distinct_users ?? entry.relay.distinct_users,
                      label: `${entry.host} compared with the most listed relay`,
                    }}
                  />
                );
              })}
            </ul>
          ) : (
            <EmptyState message="Listed relays will appear here once public relay lists have been counted." />
          )}
        </SectionCard>
      </div>

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
