import Link from "next/link";
import type { Metadata } from "next";

import { extractRelayHealthRows, relayHealthPosture } from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { MetadataList } from "@/components/explorer/metadata-list";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getRelayHealth } from "@/lib/api/endpoints";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Relay health",
  description: "Inspect relay health signals across the network.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RelayHealthPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getRelayHealth>> | null = null;

  try {
    payload = await getRelayHealth("shortTtl", { cursor });
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Failed to load relay health.");
  }
  const continuationHref = buildContinuationHref(
    "/relays/health",
    currentSearchParams,
    "cursor",
    payload?.next_cursor
  );

  const rows = extractRelayHealthRows(payload, 250).sort((left, right) => {
    const leftHealthy = left.healthy === true ? 0 : left.healthy === false ? 1 : 2;
    const rightHealthy = right.healthy === true ? 0 : right.healthy === false ? 1 : 2;
    if (leftHealthy !== rightHealthy) return leftHealthy - rightHealthy;
    return left.host.localeCompare(right.host);
  });
  const posture = relayHealthPosture(rows);
  const semantics = extractNativeApiSemantics(payload);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Relay health"
        title="Relay health"
        subtitle="Current relay health, shown directly from the health feed."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              healthy: {posture.healthy.toLocaleString()}
            </span>
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              unhealthy: {posture.unhealthy.toLocaleString()}
            </span>
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              unknown: {posture.unknown.toLocaleString()}
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

      <SectionCard title="Health observations" description="Health observations for active relays.">
        {rows.length > 0 ? (
          <ul className="space-y-2">
            {rows.slice(0, 120).map((row) => (
              <li
                key={row.host}
                id={`relay-${encodeURIComponent(row.host)}`}
                className="hover:bg-surface/40 rounded-lg p-3 transition-colors"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-ink min-w-0 truncate text-sm">{row.relay}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
                      {row.healthy === true
                        ? "healthy"
                        : row.healthy === false
                          ? "unhealthy"
                          : "health unknown"}
                    </span>
                    <Link
                      href={`/relays/${encodeURIComponent(row.host)}`}
                      className="border-edge-strong hover:border-accent-soft/40 text-link rounded-full border px-2 py-1"
                    >
                      Open relay
                    </Link>
                  </div>
                </div>
                <MetadataList
                  items={[
                    { label: "status", value: row.status ?? "n/a" },
                    { label: "latency_ms", value: row.latencyMs ?? "n/a" },
                    { label: "uptime", value: row.uptime ?? "n/a" },
                    { label: "last_seen_at", value: row.lastSeenAt ?? "n/a" },
                  ]}
                  columns={2}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="Relay health observations will appear here once probes have been collected." />
        )}
        {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
          <Link href={continuationHref} className="text-link mt-3 inline-block text-sm">
            Load more health rows
          </Link>
        ) : null}
      </SectionCard>

      <AboutThisData semantics={semantics} />
      <DebugDisclosure title="Debug payload: relay health" data={payload ?? {}} />
    </div>
  );
}
