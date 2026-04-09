import type { Metadata } from "next";

import { classifyStats, pickRelayEntryByHost } from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { MetadataList } from "@/components/explorer/metadata-list";
import { PageHero } from "@/components/explorer/page-hero";
import { RelayStatList } from "@/components/relays/relay-stat-list";
import { RelaySummaryCard } from "@/components/relays/relay-summary-card";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getRelayStats } from "@/lib/api/endpoints";

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
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getRelayStats>> | null = null;

  try {
    payload = await getRelayStats("requestTime");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load relay stats.";
  }

  const relayEntry = pickRelayEntryByHost(payload, relayHost);
  const classification = classifyStats(payload);
  const aggregatePrimitives = classification.primitives.map((entry) => ({
    label: entry.label,
    value: entry.value,
  }));

  return (
    <div className="space-y-8">
      <PageHero
        title={`Relay ${relayHost}`}
        subtitle="Relay host lookup using currently available NostrMash relay analytics payloads."
      />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <RelaySummaryCard relayHost={relayHost} relayData={relayEntry} />

      <SectionCard
        title="Availability and network context"
        description="Structured relay data from existing stats payloads."
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
            message="The current aggregate relay endpoint did not include a dedicated row for this host. A relay-specific API endpoint would improve this page."
          />
        )}
      </SectionCard>

      <RelayStatList title="Aggregate relay metrics" stats={aggregatePrimitives.slice(0, 12)} />

      <DebugDisclosure title="Debug payload: relay stats aggregate" data={payload ?? {}} />
    </div>
  );
}
