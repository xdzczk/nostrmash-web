import Link from "next/link";
import type { Metadata } from "next";

import { extractRelayHealthRows, relayHealthSummary } from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { CheckComposition } from "@/components/relays/check-composition";
import { HashTarget } from "@/components/relays/hash-target";
import { RelayStatusBoard } from "@/components/relays/relay-status-board";
import { LoadErrors } from "@/components/ui/status-panels";
import { getRelayHealth, getRelayProbeHealth } from "@/lib/api/endpoints";
import { getRequestNowMs } from "@/lib/time/request-now";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Relay status",
  description: "Which relays the index read recently, and which connection checks are failing.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RelayHealthPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const errors: string[] = [];
  let payload: Awaited<ReturnType<typeof getRelayHealth>> | null = null;
  let probes: Awaited<ReturnType<typeof getRelayProbeHealth>> | null = null;

  const [healthResult, probeResult] = await Promise.allSettled([
    getRelayHealth("shortTtl", { cursor }),
    getRelayProbeHealth("shortTtl", { limit: 200 }),
  ]);
  if (healthResult.status === "fulfilled") {
    payload = healthResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(healthResult.reason, "Failed to load relay health."));
  }
  if (probeResult.status === "fulfilled") {
    probes = probeResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(probeResult.reason, "Failed to load connection checks."));
  }

  const rows = extractRelayHealthRows(payload);
  const nowMs = getRequestNowMs();
  const health = relayHealthSummary(rows, nowMs);
  const semantics = extractNativeApiSemantics(payload);
  const probeRows = probes?.relays ?? [];
  const probeTotal = typeof probes?.total === "number" ? probes.total : probeRows.length;
  const continuationHref = buildContinuationHref(
    "/relays/health",
    currentSearchParams,
    "cursor",
    payload?.next_cursor
  );

  return (
    <div className="space-y-8">
      <HashTarget />
      <PageHero
        eyebrow="Relay status"
        title="What the index could read."
        subtitle={
          rows.length > 0
            ? `${health.current.length.toLocaleString()} relays checked in today. ${health.posture.unhealthy.toLocaleString()} checks are failing.`
            : "Ingest checkpoints and connection checks for monitored relays."
        }
      />
      <NetworkNav active="health" />

      <LoadErrors errors={errors} />

      {rows.length > 0 ? (
        <CheckComposition
          fresh={health.current.length}
          stale={health.stale}
          failing={health.posture.unhealthy}
          unknown={health.posture.unknown}
          hosts={health.hosts}
        />
      ) : null}

      {rows.length > 0 || probeRows.length > 0 ? (
        <RelayStatusBoard rows={rows} nowMs={nowMs} probes={probeRows} probeTotal={probeTotal} />
      ) : (
        <EmptyState message="Relay status will appear here once ingest checkpoints have been collected." />
      )}
      {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
        <Link href={continuationHref} className="nm-action-link">
          Load more checks
        </Link>
      ) : null}

      <AboutThisData semantics={semantics} />
      <DebugDisclosure title="Debug payload: relay health" data={payload ?? {}} />
    </div>
  );
}
