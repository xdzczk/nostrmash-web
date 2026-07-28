import Link from "next/link";
import type { Metadata } from "next";

import {
  collectStatsArraySections,
  collectStatsMetricGroups,
  pickTopPrimitiveStats,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { MetadataList } from "@/components/explorer/metadata-list";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { StatCard } from "@/components/explorer/stat-card";
import { formatMetricLabel, isRecord } from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { BarChart } from "@/components/charts/bar-chart";
import { IndexedAt } from "@/components/freshness/indexed-at";
import { LiveRefresh } from "@/components/freshness/live-refresh";
import { WindowSelector } from "@/components/explorer/window-selector";
import {
  getContentStats,
  getNetworkStats,
  getRelayStats,
  getStatsSeries,
  normalizeSeriesPoints,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractRelayRows } from "@/components/explorer/stats-utils";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import {
  formatStatsWindowLabel,
  readStatsWindow,
  type StatsWindow,
} from "@/lib/search-params/window";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "Stats",
  description: "Network, content, and relay analytics from NostrMash discovery endpoints.",
  path: "/stats",
});

const NETWORK_PRIORITY_KEYS = [
  "active_authors_24h",
  "active_authors_7d",
  "note_volume_24h",
  "note_volume_7d",
  "active_24h",
  "active_7d",
  "event_volume_24h",
  "event_volume_7d",
  "unique_authors_24h",
  "unique_authors_7d",
  "total",
];

const CONTENT_PRIORITY_KEYS = [
  "note_volume_24h",
  "note_volume_7d",
  "event_count",
  "unique_authors",
  "hashtag",
];

const RELAY_PRIORITY_KEYS = [
  "active_24h",
  "active_7d",
  "total",
  "event_volume_24h",
  "event_volume_7d",
  "unique_authors_24h",
  "unique_authors_7d",
  "event_count",
];

function StatsGroup({
  title,
  description,
  payload,
  preferredKeys,
  window,
}: {
  title: string;
  description: string;
  payload: unknown;
  preferredKeys: string[];
  window: StatsWindow;
}) {
  const topStats = pickTopPrimitiveStats(payload, preferredKeys, 6, window);
  const objectEntries = collectStatsMetricGroups(payload, 3, window);
  const arraySections = collectStatsArraySections(payload, 2, window);

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
            title="No metrics returned"
            message="The payload did not expose readable metrics for this section."
          />
        )}

        {objectEntries.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-ink-faint text-[11px]">{formatMetricLabel(group.title)}</p>
            <MetadataList items={group.items} columns={2} />
          </div>
        ))}

        {arraySections.slice(0, 2).map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-ink-faint text-[11px]">{formatMetricLabel(group.label)}</p>
            <div className="space-y-2">
              {group.value.slice(0, 8).map((entry, index) => (
                <div
                  key={`${group.label}-${index}`}
                  className="bg-surface/30 hover:bg-surface/45 rounded-lg p-3 transition-colors"
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
                    <p className="text-ink-dim text-sm">{String(entry)}</p>
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

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const window = readStatsWindow(resolvedSearchParams);
  let errorMessage = "";
  let network: Awaited<ReturnType<typeof getNetworkStats>> | null = null;
  let content: Awaited<ReturnType<typeof getContentStats>> | null = null;
  let relays: Awaited<ReturnType<typeof getRelayStats>> | null = null;

  let noteVolumeSeries: Array<{ t: number; v: number }> = [];
  let activeAuthorsSeries: Array<{ t: number; v: number }> = [];
  let relayEventsSeries: Array<{ t: number; v: number }> = [];
  let computedAt: string | null = null;
  const seriesWindow = window === "7d" ? "7d" : "7d";

  try {
    const [
      networkResult,
      contentResult,
      relaysResult,
      volumeResult,
      authorsResult,
      relaySeriesResult,
    ] = await Promise.all([
      getNetworkStats("shortTtl"),
      getContentStats("shortTtl"),
      getRelayStats("shortTtl"),
      getStatsSeries("note_volume", seriesWindow, "shortTtl"),
      getStatsSeries("active_authors", seriesWindow, "shortTtl"),
      getStatsSeries("relay_events", seriesWindow, "shortTtl"),
    ]);
    network = networkResult;
    content = contentResult;
    relays = relaysResult;
    noteVolumeSeries = normalizeSeriesPoints(volumeResult);
    activeAuthorsSeries = normalizeSeriesPoints(authorsResult);
    relayEventsSeries = normalizeSeriesPoints(relaySeriesResult);
    computedAt =
      (typeof volumeResult.computed_at === "string" && volumeResult.computed_at) ||
      (isRecord(networkResult) &&
        typeof (networkResult as Record<string, unknown>).computed_at === "string" &&
        ((networkResult as Record<string, unknown>).computed_at as string)) ||
      null;
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Failed to load stats.");
  }
  const semantics = extractNativeApiSemantics(network, content, relays);

  return (
    <div className="space-y-8">
      <LiveRefresh />
      <PageHero
        eyebrow="Signal-first analytics"
        title="Network analytics"
        subtitle="Read network, content, and relay metrics without opening raw payloads."
        badges={
          <div className="flex flex-wrap items-center gap-2">
            <WindowSelector
              path="/stats"
              searchParams={currentSearchParams}
              activeWindow={window}
            />
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1 text-xs">
              {formatStatsWindowLabel(window)}
            </span>
          </div>
        }
      />
      <IndexedAt computedAt={computedAt} />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard
        title="Time series"
        description="Hourly snapshot history for note volume, active authors, and relay events."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <p className="text-ink-faint mb-2 text-xs">Note volume</p>
            <BarChart points={noteVolumeSeries} label="Note volume" height={140} />
          </div>
          <div>
            <p className="text-ink-faint mb-2 text-xs">Active authors</p>
            <BarChart points={activeAuthorsSeries} label="Active authors" height={140} />
          </div>
          <div>
            <p className="text-ink-faint mb-2 text-xs">Relay events</p>
            <BarChart points={relayEventsSeries} label="Relay events" height={140} />
          </div>
        </div>
      </SectionCard>

      <StatsGroup
        title="Network"
        description="Node-level and topology summary data."
        payload={network ?? {}}
        preferredKeys={NETWORK_PRIORITY_KEYS}
        window={window}
      />
      <StatsGroup
        title="Content"
        description="Aggregate content activity metrics."
        payload={content ?? {}}
        preferredKeys={CONTENT_PRIORITY_KEYS}
        window={window}
      />
      <StatsGroup
        title="Relays"
        description="Relay availability and health summaries."
        payload={relays ?? {}}
        preferredKeys={RELAY_PRIORITY_KEYS}
        window={window}
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
                className={`rounded-lg p-3 transition-colors ${
                  index < 3 ? "bg-surface/60" : "hover:bg-surface/40"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-ink text-sm">
                      #{index + 1} {row.relay}
                    </p>
                    <p className="text-ink-faint mt-1 text-xs">
                      {Object.entries(row.metrics)
                        .slice(0, 3)
                        .map(([label, value]) => `${formatMetricLabel(label)}: ${String(value)}`)
                        .join(" • ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Link
                      href={`/relays/${encodeURIComponent(row.relay)}`}
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
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="Relay rankings will appear here once the index has gathered enough relay activity to rank." />
        )}
      </SectionCard>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: network stats" data={network ?? {}} />
        <DebugDisclosure title="Debug payload: content stats" data={content ?? {}} />
        <AboutThisData semantics={semantics} />
        <DebugDisclosure title="Debug payload: relay stats" data={relays ?? {}} />
      </div>
    </div>
  );
}
