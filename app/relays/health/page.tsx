import Link from "next/link";
import type { Metadata } from "next";

import {
  extractRelayHealthRows,
  formatRelayHealthSummary,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { HealthRows } from "@/components/relays/health-rows";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getRelayHealth } from "@/lib/api/endpoints";
import { getRequestNowMs } from "@/lib/time/request-now";
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

  const rows = extractRelayHealthRows(payload);
  const nowMs = getRequestNowMs();
  const healthTotal = typeof payload?.total === "number" ? payload.total : rows.length;
  const healthSummary = formatRelayHealthSummary(rows, nowMs, healthTotal);
  const semantics = extractNativeApiSemantics(payload);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Relay health"
        title="Relay health"
        subtitle={
          rows.length > 0
            ? `${healthSummary} Connection latency is under Probes.`
            : "Ingest checkpoints for monitored relays. Connection latency is under Probes."
        }
      />
      <NetworkNav active="health" />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard
        title="Ingest checkpoints"
        description="A stale checkpoint is listed with the failures. Ingest mode is how the index reads the relay, not whether the checkpoint is current."
      >
        {rows.length > 0 ? (
          <HealthRows rows={rows} nowMs={nowMs} />
        ) : (
          <EmptyState message="Relay health observations will appear here once ingest checkpoints have been collected." />
        )}
        {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
          <Link href={continuationHref} className="nm-action-link mt-3">
            Load more health rows
          </Link>
        ) : null}
      </SectionCard>

      <AboutThisData semantics={semantics} />
      <DebugDisclosure title="Debug payload: relay health" data={payload ?? {}} />
    </div>
  );
}
