import Link from "next/link";
import type { Metadata } from "next";

import {
  collectStatsArraySections,
  collectStatsMetricGroups,
  extractRelayRows,
  normalizeRelayHost,
  pickTopPrimitiveStats,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { MetadataList } from "@/components/explorer/metadata-list";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { StatCard } from "@/components/explorer/stat-card";
import { formatMetricLabel, formatValue, isRecord } from "@/components/explorer/utils";
import { RelayLink, relaySearchHref } from "@/components/relays/relay-link";
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
  sliceSeriesToHours,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
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

function dedupeDisplayedStats(
  stats: Array<{ label: string; value: string | number | boolean }>
): Array<{ label: string; value: string | number | boolean }> {
  const seen = new Set<string>();
  return stats.filter((stat) => {
    const label = formatMetricLabel(stat.label);
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}

function restatesSelectedStat(
  groupTitle: string,
  itemLabel: string,
  selected: Array<{ label: string }>
): boolean {
  const composite = `${groupTitle}_${itemLabel}`.toLowerCase();
  return selected.some((stat) => {
    const key = stat.label.toLowerCase();
    return composite === key || composite.endsWith(`_${key}`) || key.endsWith(`_${composite}`);
  });
}

function StatsGroup({
  title,
  description,
  payload,
  preferredKeys,
  window,
  cardLimit = 6,
  skipGroupTitles = [],
  skipArrayLabels = [],
  hideArrays = false,
}: {
  title: string;
  description: string;
  payload: unknown;
  preferredKeys: string[];
  window: StatsWindow;
  cardLimit?: number;
  skipGroupTitles?: string[];
  skipArrayLabels?: string[];
  hideArrays?: boolean;
}) {
  const skippedGroups = new Set(skipGroupTitles.map((title) => title.toLowerCase()));
  const skippedArrays = skipArrayLabels.map((label) => label.toLowerCase());
  const topStats = dedupeDisplayedStats(
    pickTopPrimitiveStats(payload, preferredKeys, cardLimit, window)
  );
  const objectEntries = collectStatsMetricGroups(payload, 3, window).filter(
    (group) => !skippedGroups.has(group.title.toLowerCase())
  );
  const arraySections = hideArrays
    ? []
    : collectStatsArraySections(payload, 2, window).filter((group) => {
        const label = group.label.toLowerCase();
        return !skippedArrays.some(
          (skip) => label === skip || label.endsWith(`.${skip}`) || label.endsWith(`_${skip}`)
        );
      });

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

        {objectEntries.map((group) => {
          const items = group.items.filter(
            (item) => !restatesSelectedStat(group.title, item.label, topStats)
          );
          if (items.length === 0) return null;
          return (
            <div key={group.title} className="space-y-2">
              <p className="text-ink-faint text-[11px]">{formatMetricLabel(group.title)}</p>
              <MetadataList items={items} columns={2} />
            </div>
          );
        })}

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
  // Series history is published as 7-day or 30-day blocks. The 24h control
  // slices the 7-day series down to the last day.
  const seriesWindow = "7d" as const;
  const seriesHours = window === "24h" ? 24 : 24 * 7;

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
    noteVolumeSeries = sliceSeriesToHours(normalizeSeriesPoints(volumeResult), seriesHours);
    activeAuthorsSeries = sliceSeriesToHours(normalizeSeriesPoints(authorsResult), seriesHours);
    relayEventsSeries = sliceSeriesToHours(normalizeSeriesPoints(relaySeriesResult), seriesHours);
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
      <NetworkNav active="stats" />
      <IndexedAt computedAt={computedAt} />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard
        title="Time series"
        description={
          window === "24h"
            ? "The last 24 hours of hourly history. That history is stored in 7-day blocks, and this view is the latest day of the block."
            : "Hourly history for the last 7 days. Peak and the latest point are labeled under each chart."
        }
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
        description="Authors and notes from the network stats, for the selected window."
        payload={network ?? {}}
        preferredKeys={NETWORK_PRIORITY_KEYS}
        window={window}
        cardLimit={2}
        skipGroupTitles={["relays"]}
        hideArrays
      />
      <StatsGroup
        title="Content"
        description="Counts from the content stats. Note volume here can differ slightly from the network figure above."
        payload={content ?? {}}
        preferredKeys={CONTENT_PRIORITY_KEYS}
        window={window}
      />
      <StatsGroup
        title="Relays"
        description="Relays this index reads, and the total the relay stats report. Authors seen on relays are not the same count as active authors above."
        payload={relays ?? {}}
        preferredKeys={RELAY_PRIORITY_KEYS}
        window={window}
        skipArrayLabels={["top"]}
      />
      <SectionCard
        title="Relay leaderboard"
        description="Indexed event volume. This ranking is not split into 24-hour and 7-day views, so the window control above does not reorder it."
      >
        {extractRelayRows(relays, 12).length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {extractRelayRows(relays, 12).map((row, index) => {
              const host = normalizeRelayHost(row.relay);
              return (
                <li
                  key={`${row.relay}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2"
                >
                  <div className="min-w-0">
                    {host ? (
                      <RelayLink host={host} rank={index + 1} />
                    ) : (
                      <p className="text-ink text-sm">
                        #{index + 1} {row.relay}
                      </p>
                    )}
                    <p className="text-ink-faint text-xs">
                      {Object.entries(row.metrics)
                        .slice(0, 3)
                        .map(
                          ([label, value]) => `${formatMetricLabel(label)}: ${formatValue(value)}`
                        )
                        .join(" · ")}
                    </p>
                  </div>
                  {host ? (
                    <Link href={relaySearchHref(host)} className="nm-action-link">
                      Search mentions
                    </Link>
                  ) : null}
                </li>
              );
            })}
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
