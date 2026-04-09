import type { Metadata } from "next";

import { classifyStats } from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { MetadataList } from "@/components/explorer/metadata-list";
import { PageHero } from "@/components/explorer/page-hero";
import { StatCard } from "@/components/explorer/stat-card";
import { isRecord } from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getContentStats, getNetworkStats, getRelayStats } from "@/lib/api/endpoints";

export const metadata: Metadata = {
  title: "Stats",
  description: "Network, content, and relay analytics from NostrMash discovery endpoints.",
};

function StatsGroup({
  title,
  description,
  payload,
}: {
  title: string;
  description: string;
  payload: unknown;
}) {
  const sections = classifyStats(payload);
  const objectEntries = sections.objects.map((entry) => ({
    title: entry.label,
    items: Object.entries(entry.value).map(([label, value]) => ({ label, value })),
  }));
  const arraySections = sections.arrays;

  return (
    <SectionCard title={title} description={description}>
      <div className="space-y-4">
        {sections.primitives.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.primitives.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        ) : (
          <EmptyState title="No top-level metrics" message="No primitive fields were returned." />
        )}

        {objectEntries.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-xs tracking-wide text-zinc-500 uppercase">{group.title}</p>
            <MetadataList items={group.items} columns={2} />
          </div>
        ))}

        {arraySections.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-xs tracking-wide text-zinc-500 uppercase">{group.label}</p>
            <div className="space-y-2">
              {group.value.slice(0, 12).map((entry, index) => (
                <div
                  key={`${group.label}-${index}`}
                  className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3"
                >
                  {isRecord(entry) ? (
                    <MetadataList
                      items={Object.entries(entry)
                        .slice(0, 6)
                        .map(([label, value]) => ({ label, value }))}
                      columns={2}
                    />
                  ) : (
                    <p className="text-sm text-zinc-300">{String(entry)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export default async function StatsPage() {
  let errorMessage = "";
  let network: Awaited<ReturnType<typeof getNetworkStats>> | null = null;
  let content: Awaited<ReturnType<typeof getContentStats>> | null = null;
  let relays: Awaited<ReturnType<typeof getRelayStats>> | null = null;

  try {
    [network, content, relays] = await Promise.all([
      getNetworkStats("shortTtl"),
      getContentStats("shortTtl"),
      getRelayStats("shortTtl"),
    ]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load stats.";
  }

  return (
    <div className="space-y-8">
      <PageHero
        title="Network analytics"
        subtitle="Read network, content, and relay metrics without opening raw payloads."
      />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <StatsGroup
        title="Network"
        description="Node-level and topology summary data."
        payload={network ?? {}}
      />
      <StatsGroup
        title="Content"
        description="Aggregate content activity metrics."
        payload={content ?? {}}
      />
      <StatsGroup
        title="Relays"
        description="Relay availability and health summaries."
        payload={relays ?? {}}
      />

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: network stats" data={network ?? {}} />
        <DebugDisclosure title="Debug payload: content stats" data={content ?? {}} />
        <DebugDisclosure title="Debug payload: relay stats" data={relays ?? {}} />
      </div>
    </div>
  );
}
