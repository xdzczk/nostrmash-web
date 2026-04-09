import Link from "next/link";
import type { Metadata } from "next";

import { classifyStats, pickTopPrimitiveStats } from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { MetadataList } from "@/components/explorer/metadata-list";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { StatCard } from "@/components/explorer/stat-card";
import { formatMetricLabel, isRecord } from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getContentStats, getNetworkStats, getRelayStats } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractRelayRows } from "@/components/explorer/stats-utils";

export const metadata: Metadata = {
  title: "Stats",
  description: "Network, content, and relay analytics from NostrMash discovery endpoints.",
};

const NETWORK_PRIORITY_KEYS = [
  "total_nodes",
  "active_nodes",
  "active_relays",
  "active_authors",
  "total_profiles",
  "consistency",
];

const CONTENT_PRIORITY_KEYS = [
  "note_count",
  "total_notes",
  "event_count",
  "unique_authors",
  "top_hashtag_count",
  "consistency",
];

const RELAY_PRIORITY_KEYS = [
  "relay_count",
  "total_relays",
  "active_relays",
  "top_relay_count",
  "relay_mentions",
  "consistency",
];

function StatsGroup({
  title,
  description,
  payload,
  preferredKeys,
}: {
  title: string;
  description: string;
  payload: unknown;
  preferredKeys: string[];
}) {
  const sections = classifyStats(payload);
  const topStats = pickTopPrimitiveStats(payload, preferredKeys, 6);
  const objectEntries = sections.objects
    .map((entry) => ({
      title: entry.label,
      items: Object.entries(entry.value)
        .filter(
          ([, value]) =>
            typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        )
        .map(([label, value]) => ({ label, value })),
    }))
    .filter((entry) => entry.items.length > 0)
    .slice(0, 3);
  const arraySections = sections.arrays;

  return (
    <SectionCard title={title} description={description}>
      <div className="space-y-4">
        {topStats.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {topStats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No top-level signal returned"
            message="The payload did not expose primitive metrics for this section."
          />
        )}

        {objectEntries.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
              {formatMetricLabel(group.title)}
            </p>
            <MetadataList items={group.items} columns={2} />
          </div>
        ))}

        {arraySections.slice(0, 2).map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
              {formatMetricLabel(group.label)}
            </p>
            <div className="space-y-2">
              {group.value.slice(0, 8).map((entry, index) => (
                <div
                  key={`${group.label}-${index}`}
                  className="rounded-md border border-zinc-800 bg-zinc-900/30 p-3"
                >
                  {isRecord(entry) ? (
                    <MetadataList
                      items={Object.entries(entry)
                        .filter(
                          ([, value]) =>
                            typeof value === "string" ||
                            typeof value === "number" ||
                            typeof value === "boolean"
                        )
                        .slice(0, 4)
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
  const semantics = extractNativeApiSemantics(network, content, relays);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Signal-first analytics"
        title="Network analytics"
        subtitle="Read network, content, and relay metrics without opening raw payloads."
        badges={
          <div className="flex flex-wrap gap-2">
            <NativeSemanticsBadges semantics={semantics} />
          </div>
        }
      />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <StatsGroup
        title="Network"
        description="Node-level and topology summary data."
        payload={network ?? {}}
        preferredKeys={NETWORK_PRIORITY_KEYS}
      />
      <StatsGroup
        title="Content"
        description="Aggregate content activity metrics."
        payload={content ?? {}}
        preferredKeys={CONTENT_PRIORITY_KEYS}
      />
      <StatsGroup
        title="Relays"
        description="Relay availability and health summaries."
        payload={relays ?? {}}
        preferredKeys={RELAY_PRIORITY_KEYS}
      />
      <SectionCard
        title="Relay leaderboard"
        description="Top relay entities extracted from the aggregate relay stats payload."
      >
        {extractRelayRows(relays, 12).length > 0 ? (
          <ul className="space-y-2">
            {extractRelayRows(relays, 12).map((row, index) => (
              <li
                key={`${row.relay}-${index}`}
                className={`rounded-md border p-3 ${
                  index < 3 ? "border-zinc-700 bg-zinc-900/65" : "border-zinc-800 bg-zinc-900/40"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-zinc-100">
                      #{index + 1} {row.relay}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {Object.entries(row.metrics)
                        .slice(0, 3)
                        .map(([label, value]) => `${formatMetricLabel(label)}: ${String(value)}`)
                        .join(" • ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Link
                      href={`/relays/${encodeURIComponent(row.relay)}`}
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
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Relay ranking unavailable"
            message="No relay rows were returned in the aggregate relay payload."
          />
        )}
      </SectionCard>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: network stats" data={network ?? {}} />
        <DebugDisclosure title="Debug payload: content stats" data={content ?? {}} />
        <DebugDisclosure title="Debug payload: relay stats" data={relays ?? {}} />
      </div>
    </div>
  );
}
