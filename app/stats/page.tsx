import Link from "@/components/app-link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { readStatNumber } from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { AboutThisData, readStatsSections } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { StatCard } from "@/components/explorer/stat-card";
import { isRecord } from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { LoadErrors } from "@/components/ui/status-panels";
import { DeltaChart } from "@/components/charts/delta-chart";
import type { SeriesPoint } from "@/components/charts/sparkline";
import { IndexedAt } from "@/components/freshness/indexed-at";
import { LiveRefresh } from "@/components/freshness/live-refresh";
import { WindowSelector } from "@/components/explorer/window-selector";
import {
  AccountStatsSection,
  ClientStatsSection,
  IdentityStatsSection,
  ZapStatsSection,
} from "@/components/stats/ecosystem-sections";
import { SeriesMetricSelector } from "@/components/stats/series-metric-selector";
import { DiscoverySurfaceStats } from "@/components/stats/discovery-surface-stats";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAccountStats,
  getClientStats,
  getContentStats,
  getIdentityStats,
  getNetworkStats,
  getRelayStats,
  getStatsSeries,
  getZapStats,
  normalizeSeriesPoints,
  parseStatsSeriesMetric,
  STATS_SERIES_METRIC_LABELS,
  type StatsSeriesMetric,
  type StatsSeriesResponse,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { readSearchParam, toUrlSearchParams } from "@/lib/search-params/pagination";
import {
  STATS_WINDOWS,
  formatStatsWindowLength,
  readStatsWindow,
  relayStatsWindow,
} from "@/lib/search-params/window";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "Stats",
  description: "How note volume, authors, clients, zaps, and indexed relays are moving.",
  path: "/stats",
});

function latestValue(points: SeriesPoint[]): number | null {
  const latest = points[points.length - 1];
  return latest ? latest.v : null;
}

function MovingFigure({
  label,
  value,
  points,
  chartLabel,
  caption = "Rolling 24-hour total",
  formatValue,
}: {
  label: string;
  value: number | null;
  points: SeriesPoint[];
  chartLabel: string;
  caption?: string;
  formatValue?: (value: number) => string;
}) {
  const formatted =
    value === null ? "—" : formatValue ? formatValue(value) : value.toLocaleString();
  return (
    <div className="space-y-3">
      <div>
        <p className="text-ink-faint text-xs">{label}</p>
        <p className="text-ink mt-1 text-2xl font-semibold tracking-[-0.03em] tabular-nums">
          {formatted}
        </p>
        <p className="text-ink-faint mt-1 text-xs">{caption}</p>
      </div>
      <DeltaChart points={points} label={chartLabel} />
    </div>
  );
}

function seriesPointsForMetric(metric: StatsSeriesMetric, points: SeriesPoint[]): SeriesPoint[] {
  if (metric !== "bridged_share_bps") return points;
  return points.map((point) => ({ t: point.t, v: point.v / 100 }));
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const window = readStatsWindow(resolvedSearchParams);
  const relayWindow = relayStatsWindow(window);
  const seriesMetric = parseStatsSeriesMetric(readSearchParam(resolvedSearchParams, "series"));
  const errors: string[] = [];
  let network: Awaited<ReturnType<typeof getNetworkStats>> | null = null;
  let content: Awaited<ReturnType<typeof getContentStats>> | null = null;
  let relays: Awaited<ReturnType<typeof getRelayStats>> | null = null;
  let clients: Awaited<ReturnType<typeof getClientStats>> | null = null;
  let identity: Awaited<ReturnType<typeof getIdentityStats>> | null = null;
  let zaps: Awaited<ReturnType<typeof getZapStats>> | null = null;
  let accounts: Awaited<ReturnType<typeof getAccountStats>> | null = null;

  let noteVolumeSeries: SeriesPoint[] = [];
  let activeAuthorsSeries: SeriesPoint[] = [];
  let relayEventsSeries: SeriesPoint[] = [];
  let selectedSeries: StatsSeriesResponse | null = null;
  let computedAt: string | null = null;

  const needsExtraSeries =
    seriesMetric !== "note_volume" &&
    seriesMetric !== "active_authors" &&
    seriesMetric !== "relay_events";

  const settled = await Promise.allSettled([
    getNetworkStats("shortTtl"),
    getContentStats("shortTtl"),
    getRelayStats("shortTtl", window),
    getStatsSeries("note_volume", window, "shortTtl"),
    getStatsSeries("active_authors", window, "shortTtl"),
    getStatsSeries("relay_events", window, "shortTtl"),
    needsExtraSeries ? getStatsSeries(seriesMetric, window, "shortTtl") : Promise.resolve(null),
    getClientStats("shortTtl", window),
    getIdentityStats("shortTtl"),
    getZapStats("shortTtl", window),
    getAccountStats("shortTtl"),
  ]);
  const fail = (index: number, fallback: string) => {
    const result = settled[index];
    if (result?.status === "rejected") {
      errors.push(toUserFacingErrorMessage(result.reason, fallback));
    }
  };
  if (settled[0]?.status === "fulfilled") network = settled[0].value;
  else fail(0, "Failed to load network stats.");
  if (settled[1]?.status === "fulfilled") content = settled[1].value;
  else fail(1, "Failed to load content stats.");
  if (settled[2]?.status === "fulfilled") relays = settled[2].value;
  else fail(2, "Failed to load relay stats.");
  if (settled[3]?.status === "fulfilled") {
    noteVolumeSeries = normalizeSeriesPoints(settled[3].value);
    if (typeof settled[3].value.computed_at === "string") computedAt = settled[3].value.computed_at;
  } else fail(3, "Failed to load note volume.");
  if (settled[4]?.status === "fulfilled")
    activeAuthorsSeries = normalizeSeriesPoints(settled[4].value);
  else fail(4, "Failed to load author series.");
  if (settled[5]?.status === "fulfilled")
    relayEventsSeries = normalizeSeriesPoints(settled[5].value);
  else fail(5, "Failed to load relay series.");
  if (settled[6]?.status === "fulfilled") selectedSeries = settled[6].value;
  else fail(6, "Failed to load the selected series.");
  if (settled[7]?.status === "fulfilled") clients = settled[7].value;
  else fail(7, "Failed to load client stats.");
  if (settled[8]?.status === "fulfilled") identity = settled[8].value;
  else fail(8, "Failed to load identity stats.");
  if (settled[9]?.status === "fulfilled") zaps = settled[9].value;
  else fail(9, "Failed to load zap stats.");
  if (settled[10]?.status === "fulfilled") accounts = settled[10].value;
  else fail(10, "Failed to load account stats.");
  if (!computedAt && isRecord(network) && typeof network.computed_at === "string") {
    computedAt = network.computed_at;
  }

  const selectedPoints = seriesPointsForMetric(
    seriesMetric,
    normalizeSeriesPoints(
      seriesMetric === "note_volume"
        ? { points: noteVolumeSeries }
        : seriesMetric === "active_authors"
          ? { points: activeAuthorsSeries }
          : seriesMetric === "relay_events"
            ? { points: relayEventsSeries }
            : selectedSeries
    )
  );
  const selectedCaption =
    seriesMetric === "bridged_share_bps"
      ? "Rolling 24-hour share, in percent."
      : "Rolling 24-hour total";
  const formatSelected =
    seriesMetric === "bridged_share_bps"
      ? (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
      : undefined;
  const semantics = extractNativeApiSemantics(network, content, relays);
  const windowPhrase = formatStatsWindowLength(window);
  const authors =
    readStatNumber(network, [`active_authors_${window}`]) ?? latestValue(activeAuthorsSeries);
  const noteVolume =
    readStatNumber(network, [`note_volume_${window}`]) ?? latestValue(noteVolumeSeries);
  const eventsIngested = readStatNumber(content, ["events_ingested"]);
  const profiles = readStatNumber(content, ["projected_profiles"]);
  const relaysIndexed = readStatNumber(relays, [
    `active_${relayWindow}`,
    `relays_active_${relayWindow}`,
  ]);
  const relayUrls = readStatNumber(relays, ["total", "relays_total"]);
  const relayEvents =
    readStatNumber(relays, [`event_volume_${relayWindow}`, `relays_event_volume_${relayWindow}`]) ??
    latestValue(relayEventsSeries);
  const relayAuthors = readStatNumber(relays, [`unique_authors_${relayWindow}`]);

  return (
    <div className="space-y-8">
      <LiveRefresh />
      <PageHero
        eyebrow="Statistics"
        title="How the index is moving."
        subtitle={`Note volume and authors over the last ${windowPhrase}, and how those rolling totals change from one sample to the next.`}
        badges={
          <WindowSelector
            path="/stats"
            searchParams={currentSearchParams}
            activeWindow={window}
            windows={STATS_WINDOWS}
          />
        }
      />
      <NetworkNav active="stats" />
      <IndexedAt computedAt={computedAt} />

      <LoadErrors errors={errors} />

      <SectionCard
        title="This window"
        description="Each sample is a rolling 24-hour total. The bars are how that total moved since the previous sample, not the notes from that hour alone."
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <MovingFigure
            label="Note authors"
            value={authors}
            points={activeAuthorsSeries}
            chartLabel="Change in note authors"
          />
          <MovingFigure
            label="Note volume"
            value={noteVolume}
            points={noteVolumeSeries}
            chartLabel="Change in note volume"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Rolling series"
        description="Each point is a rolling 24-hour total, sampled once per UTC hour."
      >
        <SeriesMetricSelector
          path="/stats"
          searchParams={currentSearchParams}
          active={seriesMetric}
        />
        <div className="mt-6">
          <MovingFigure
            label={STATS_SERIES_METRIC_LABELS[seriesMetric]}
            value={latestValue(selectedPoints)}
            points={selectedPoints}
            chartLabel={`Change in ${STATS_SERIES_METRIC_LABELS[seriesMetric].toLowerCase()}`}
            caption={selectedCaption}
            formatValue={formatSelected}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="On record"
        description="Totals for the whole index. Note volume for this window is the figure above."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {eventsIngested !== null ? (
            <StatCard
              plain
              label="Events ingested"
              value={eventsIngested}
              description="Events stored by this index."
            />
          ) : null}
          {profiles !== null ? (
            <StatCard
              plain
              label="Profiles on record"
              value={profiles}
              description="Profiles projected from those events."
            />
          ) : null}
        </div>
        <p className="text-ink-muted mt-4 text-sm">
          Topics are ranked on{" "}
          <Link href="/trending/hashtags" className="nm-action-link">
            Discover
          </Link>
          .
        </p>
      </SectionCard>

      <SectionCard
        title="Relays this index reads"
        description="These counts are the index's own view. The public list of relays people publish is much larger, and lives under Popular relays."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {relaysIndexed !== null ? (
            <StatCard
              plain
              label={`Relays indexed (${relayWindow})`}
              value={relaysIndexed}
              description="Relays that delivered events during this window."
            />
          ) : null}
          {relayUrls !== null ? (
            <StatCard
              plain
              label="Relay URLs on record"
              value={relayUrls}
              description="Distinct relay URLs that have ever delivered an event. This is not the public relay list."
            />
          ) : null}
          {relayEvents !== null ? (
            <StatCard
              plain
              label={`Events from relays (${relayWindow})`}
              value={relayEvents}
              description="Event volume reported by relay stats for this window."
            />
          ) : null}
          {relayAuthors !== null ? (
            <StatCard
              plain
              label={`Authors on relays (${relayWindow})`}
              value={relayAuthors}
              description="Authors seen on a relay, any event kind. This is not the note-author count above."
            />
          ) : null}
        </div>
        <div className="mt-6">
          <DeltaChart points={relayEventsSeries} label="Change in relay events" />
        </div>
      </SectionCard>

      <ClientStatsSection data={clients} window={window} />
      <ZapStatsSection data={zaps} window={window} />
      <AccountStatsSection data={accounts} />
      <IdentityStatsSection data={identity} />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <DiscoverySurfaceStats window={window} searchParams={currentSearchParams} />
      </Suspense>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: network stats" data={network ?? {}} />
        <DebugDisclosure title="Debug payload: content stats" data={content ?? {}} />
        <AboutThisData
          semantics={semantics}
          sections={readStatsSections(network, content, relays)}
        />
        <DebugDisclosure title="Debug payload: relay stats" data={relays ?? {}} />
      </div>
    </div>
  );
}
