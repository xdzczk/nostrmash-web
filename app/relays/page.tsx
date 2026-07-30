import Link from "next/link";
import type { Metadata } from "next";

import {
  extractRelayHealthRows,
  rankRelayActivity,
  relayHealthPosture,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { StatCard } from "@/components/explorer/stat-card";
import { formatMetricLabel, formatValue } from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { LoadErrors, SoftRefreshNote } from "@/components/ui/status-panels";
import { getRelayHealth, getRelayStats } from "@/lib/api/endpoints";
import { getStaleDataNotice } from "@/lib/api/http";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Network",
  description: "Understand Nostr relay activity, reach, and current network health.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RelaysPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const healthCursor = readSearchParam(resolvedSearchParams, "health_cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const errors: string[] = [];
  let relayStats: Awaited<ReturnType<typeof getRelayStats>> | null = null;
  let relayHealth: Awaited<ReturnType<typeof getRelayHealth>> | null = null;

  const [statsResult, healthResult] = await Promise.allSettled([
    getRelayStats("shortTtl"),
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

  const rankedRelays = rankRelayActivity(relayStats, 40);
  const healthRows = extractRelayHealthRows(relayHealth, 200);
  const healthByHost = new Map(healthRows.map((row) => [row.host, row]));
  const posture = relayHealthPosture(healthRows);
  const semantics = extractNativeApiSemantics(relayStats, relayHealth);
  const totalActivity = rankedRelays.reduce((sum, row) => sum + row.activityScore, 0);
  const healthContinuationHref = buildContinuationHref(
    "/relays",
    currentSearchParams,
    "health_cursor",
    relayHealth?.next_cursor
  );

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Network intelligence"
        title="The network behind the conversation."
        subtitle="Understand where activity is concentrated, which relays are reachable, and how fresh the evidence is."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              ranked relays: {rankedRelays.length.toLocaleString()}
            </span>
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              health rows: {healthRows.length.toLocaleString()}
            </span>
            <Link
              href="/relays/health"
              className="border-edge-strong hover:border-accent-soft/40 text-link rounded-full border px-2 py-1"
            >
              Ingest health
            </Link>
            <Link
              href="/relays/popular"
              className="border-edge-strong hover:border-accent-soft/40 text-link rounded-full border px-2 py-1"
            >
              Popular relays
            </Link>
            <Link
              href="/relays/probe-health"
              className="border-edge-strong hover:border-accent-soft/40 text-link rounded-full border px-2 py-1"
            >
              Probe health
            </Link>
          </div>
        }
      />
      <NetworkNav active="overview" />

      {staleNotice ? <SoftRefreshNote message={staleNotice} /> : null}
      <LoadErrors errors={errors} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="active relay rows" value={rankedRelays.length} />
        {posture.healthy + posture.unhealthy === 0 ? (
          <div className="border-edge/80 bg-surface/35 text-ink-muted col-span-full rounded-xl border px-4 py-3 text-sm sm:col-span-3">
            Health probes unavailable for this window. Activity rankings below still reflect
            observed relay share.
          </div>
        ) : (
          <>
            <StatCard label="healthy relays" value={posture.healthy} />
            <StatCard label="unhealthy relays" value={posture.unhealthy} />
            <StatCard label="unknown health" value={posture.unknown} />
          </>
        )}
      </section>

      <SectionCard title="Dominant relay activity" description="Relays carrying the most activity.">
        {rankedRelays.length > 0 ? (
          <ul className="space-y-2">
            {rankedRelays.slice(0, 20).map((row) => {
              const health = healthByHost.get(row.host);
              const share =
                totalActivity > 0 ? ((row.activityScore / totalActivity) * 100).toFixed(1) : "0.0";
              return (
                <li key={row.host} className="hover:bg-surface/40 rounded-lg p-3 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-ink truncate text-sm">
                        #{row.rank} {row.relay}
                      </p>
                      <p className="text-ink-faint mt-1 truncate text-xs">
                        activity share: {share}% • score: {row.activityScore.toLocaleString()}
                        {health?.healthy === true
                          ? " • health: healthy"
                          : health?.healthy === false
                            ? " • health: unhealthy"
                            : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Link
                        href={`/relays/${encodeURIComponent(row.host)}`}
                        className="border-edge-strong hover:border-accent-soft/40 text-link rounded-full border px-3 py-1"
                      >
                        Open relay
                      </Link>
                      <Link
                        href={`/search?q=${encodeURIComponent(row.relay)}&tab=all`}
                        className="border-edge-strong hover:border-accent-soft/40 text-link rounded-full border px-3 py-1"
                      >
                        Search mentions
                      </Link>
                    </div>
                  </div>
                  <p className="text-ink-faint mt-2 truncate text-xs">
                    {Object.entries(row.metrics)
                      .slice(0, 3)
                      .map(([label, value]) => `${formatMetricLabel(label)}: ${formatValue(value)}`)
                      .join(" • ")}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState message="Relay activity rankings will appear here once the index has gathered enough relay stats to rank." />
        )}
        {typeof relayHealth?.next_cursor === "string" && relayHealth.next_cursor.length > 0 ? (
          <Link href={healthContinuationHref} className="text-link mt-3 inline-block text-sm">
            Load more relay health context
          </Link>
        ) : null}
      </SectionCard>

      <DebugDisclosure title="Debug payload: relay stats" data={relayStats ?? {}} />
      <AboutThisData semantics={semantics} />
      <DebugDisclosure title="Debug payload: relay health" data={relayHealth ?? {}} />
    </div>
  );
}
