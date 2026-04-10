import Link from "next/link";
import type { Metadata } from "next";

import {
  classifyStats,
  extractRelayHealthRows,
  normalizeRelayHost,
  rankRelayActivity,
  relayHealthPosture,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { MetadataList } from "@/components/explorer/metadata-list";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { RelayStatList } from "@/components/relays/relay-stat-list";
import { RelaySummaryCard } from "@/components/relays/relay-summary-card";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getRelayHealth, getRelayStats } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";

type Params = Promise<{ relayHost: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { relayHost } = await params;
  return {
    title: `Relay ${relayHost}`,
    description: `NostrMash relay explorer page for ${relayHost}.`,
  };
}

export default async function RelayPage({ params }: { params: Params }) {
  const { relayHost } = await params;
  const normalizedRelayHost = normalizeRelayHost(relayHost) || relayHost.toLowerCase();
  const errors: string[] = [];
  let payload: Awaited<ReturnType<typeof getRelayStats>> | null = null;
  let healthPayload: Awaited<ReturnType<typeof getRelayHealth>> | null = null;

  const [statsResult, healthResult] = await Promise.allSettled([
    getRelayStats("requestTime"),
    getRelayHealth("requestTime"),
  ]);
  if (statsResult.status === "fulfilled") {
    payload = statsResult.value;
  } else {
    errors.push(
      statsResult.reason instanceof Error
        ? statsResult.reason.message
        : "Failed to load relay stats."
    );
  }
  if (healthResult.status === "fulfilled") {
    healthPayload = healthResult.value;
  } else {
    errors.push(
      healthResult.reason instanceof Error
        ? healthResult.reason.message
        : "Failed to load relay health."
    );
  }

  const rankedActivity = rankRelayActivity(payload, 200);
  const relayActivity = rankedActivity.find((entry) => entry.host === normalizedRelayHost) ?? null;
  const relayEntry = relayActivity?.metrics ?? null;
  const neighboringRelays = rankedActivity
    .filter((entry) => entry.host !== normalizedRelayHost)
    .slice(0, 8);
  const activityTotal = rankedActivity.reduce((sum, entry) => sum + entry.activityScore, 0);
  const activityShare =
    relayActivity && activityTotal > 0
      ? ((relayActivity.activityScore / activityTotal) * 100).toFixed(1)
      : null;

  const healthRows = extractRelayHealthRows(healthPayload, 250);
  const relayHealth = healthRows.find((entry) => entry.host === normalizedRelayHost) ?? null;
  const healthPosture = relayHealthPosture(healthRows);
  const semantics = extractNativeApiSemantics(payload, healthPayload);
  const classification = classifyStats(payload);
  const aggregatePrimitives = classification.primitives.map((entry) => ({
    label: entry.label,
    value: entry.value,
  }));

  return (
    <div className="space-y-8">
      <PageHero
        title={`Relay ${relayHost}`}
        subtitle="Relay detail with activity rank, health status, and provenance links."
        badges={
          <div className="flex flex-wrap gap-2">
            <NativeSemanticsBadges semantics={semantics} />
            <Link
              href="/relays"
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-indigo-300 hover:border-indigo-400/40"
            >
              Open relay ranking
            </Link>
            <Link
              href={`/relays/health#relay-${encodeURIComponent(normalizedRelayHost)}`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-indigo-300 hover:border-indigo-400/40"
            >
              Open relay health row
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(relayHost)}&tab=all`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-indigo-300 hover:border-indigo-400/40"
            >
              Search relay mentions
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(relayHost)}&tab=notes`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-indigo-300 hover:border-indigo-400/40"
            >
              Open relay note activity
            </Link>
            <Link
              href="/discovery/conversations/hot"
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-indigo-300 hover:border-indigo-400/40"
            >
              Open hot conversations
            </Link>
          </div>
        }
      />

      {errors.length > 0 ? <ErrorPanel message={errors.join(" | ")} /> : null}

      <RelaySummaryCard
        relayHost={relayHost}
        relayData={relayEntry ?? relayHealth?.details ?? null}
      />

      {relayActivity || relayHealth ? (
        <SectionCard
          title="Activity and health status"
          description="Where this relay sits in current activity and health reporting."
        >
          <MetadataList
            items={[
              {
                label: "activity_rank",
                value: relayActivity?.rank ?? "n/a",
              },
              {
                label: "activity_share_percent",
                value: activityShare ? `${activityShare}%` : "n/a",
              },
              {
                label: "healthy",
                value: relayHealth?.healthy ?? "n/a",
              },
              {
                label: "status",
                value: relayHealth?.status ?? "n/a",
              },
              {
                label: "latency_ms",
                value: relayHealth?.latencyMs ?? "n/a",
              },
              {
                label: "health_coverage",
                value:
                  healthPosture.total > 0
                    ? `${healthPosture.healthy} healthy / ${healthPosture.unhealthy} unhealthy / ${healthPosture.unknown} unknown`
                    : "n/a",
              },
            ]}
            columns={2}
          />
        </SectionCard>
      ) : null}

      <SectionCard
        title="Availability and network context"
        description="Structured relay stats row extracted for this host."
      >
        {relayEntry ? (
          <MetadataList
            items={Object.entries(relayEntry as Record<string, unknown>).map(([label, value]) => ({
              label,
              value,
            }))}
            columns={2}
          />
        ) : (
          <EmptyState
            title="Relay-level row not found"
            message="No direct relay row was found in the aggregate relay stats payload for this host."
          />
        )}
      </SectionCard>

      <RelayStatList title="Aggregate relay metrics" stats={aggregatePrimitives.slice(0, 12)} />
      <div id="observed-activity">
        <SectionCard
          title="Nearby dominant relays"
          description="Top peers currently dominating the same activity window."
        >
          {neighboringRelays.length > 0 ? (
            <ul className="space-y-2">
              {neighboringRelays.map((entry) => (
                <li
                  key={entry.host}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">
                      #{entry.rank} {entry.relay}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      score {entry.activityScore.toLocaleString()} •{" "}
                      {Object.entries(entry.metrics)
                        .slice(0, 2)
                        .map(([label, value]) => `${label}: ${String(value)}`)
                        .join(" • ")}
                    </p>
                  </div>
                  <Link
                    href={`/relays/${encodeURIComponent(entry.host)}`}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-indigo-300 hover:border-indigo-400/40"
                  >
                    Open relay
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No additional relay rows were found in this payload." />
          )}
        </SectionCard>
      </div>

      <DebugDisclosure title="Debug payload: relay stats aggregate" data={payload ?? {}} />
      <DebugDisclosure title="Debug payload: relay health" data={healthPayload ?? {}} />
    </div>
  );
}
