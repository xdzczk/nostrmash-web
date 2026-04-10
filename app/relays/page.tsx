import Link from "next/link";
import type { Metadata } from "next";

import {
  extractRelayHealthRows,
  rankRelayActivity,
  relayHealthPosture,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { StatCard } from "@/components/explorer/stat-card";
import { formatMetricLabel } from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getRelayHealth, getRelayStats } from "@/lib/api/endpoints";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { extractNativeApiSemantics } from "@/lib/api/normalize";

export const metadata: Metadata = {
  title: "Relay explorer",
  description: "Explore relay activity rankings and current health status.",
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
    errors.push(
      statsResult.reason instanceof Error ? statsResult.reason.message : "Relay stats failed."
    );
  }
  if (healthResult.status === "fulfilled") {
    relayHealth = healthResult.value;
  } else {
    errors.push(
      healthResult.reason instanceof Error ? healthResult.reason.message : "Relay health failed."
    );
  }

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
        eyebrow="Relay exploration"
        title="Relay explorer"
        subtitle="Track active relays, inspect current health status, and open relay detail routes from one place."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              ranked relays: {rankedRelays.length.toLocaleString()}
            </span>
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              health rows: {healthRows.length.toLocaleString()}
            </span>
            <Link
              href="/relays/health"
              className="rounded-full border border-zinc-700 px-2 py-1 text-indigo-300 hover:border-indigo-400/40"
            >
              Open relay health
            </Link>
          </div>
        }
      />

      {errors.length > 0 ? <ErrorPanel message={errors.join(" | ")} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="active relay rows" value={rankedRelays.length} />
        <StatCard label="healthy relays" value={posture.healthy} />
        <StatCard label="unhealthy relays" value={posture.unhealthy} />
        <StatCard label="unknown health" value={posture.unknown} />
      </section>

      <SectionCard
        title="Dominant relay activity"
        description="Relays with the most activity right now."
      >
        {rankedRelays.length > 0 ? (
          <ul className="space-y-2">
            {rankedRelays.slice(0, 20).map((row) => {
              const health = healthByHost.get(row.host);
              const share =
                totalActivity > 0 ? ((row.activityScore / totalActivity) * 100).toFixed(1) : "0.0";
              return (
                <li key={row.host} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-100">
                        #{row.rank} {row.relay}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        activity share: {share}% • score: {row.activityScore.toLocaleString()} •
                        health:{" "}
                        {health?.healthy === true
                          ? "healthy"
                          : health?.healthy === false
                            ? "unhealthy"
                            : "unknown"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Link
                        href={`/relays/${encodeURIComponent(row.host)}`}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-indigo-300 hover:border-indigo-400/40"
                      >
                        Open relay
                      </Link>
                      <Link
                        href={`/search?q=${encodeURIComponent(row.relay)}&tab=all`}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-indigo-300 hover:border-indigo-400/40"
                      >
                        Search mentions
                      </Link>
                    </div>
                  </div>
                  <p className="mt-2 truncate text-xs text-zinc-500">
                    {Object.entries(row.metrics)
                      .slice(0, 3)
                      .map(([label, value]) => `${formatMetricLabel(label)}: ${String(value)}`)
                      .join(" • ")}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="Relay rankings unavailable"
            message="The relay stats payload did not contain rankable relay rows."
          />
        )}
        {typeof relayHealth?.next_cursor === "string" && relayHealth.next_cursor.length > 0 ? (
          <Link href={healthContinuationHref} className="mt-3 inline-block text-sm text-indigo-300">
            Load more relay health context
          </Link>
        ) : null}
      </SectionCard>

      <DebugDisclosure title="Debug payload: relay stats" data={relayStats ?? {}} />
      <DebugDisclosure title="Debug payload: relay health" data={relayHealth ?? {}} />
    </div>
  );
}
