import Link from "next/link";
import type { Metadata } from "next";

import { readStatNumber } from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { AboutThisData, readStatsSections } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { StatCard } from "@/components/explorer/stat-card";
import { isRecord } from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { DeltaChart } from "@/components/charts/delta-chart";
import type { SeriesPoint } from "@/components/charts/sparkline";
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
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import { readStatsWindow } from "@/lib/search-params/window";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "Stats",
  description: "How note volume, authors, and indexed relays are moving.",
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
}: {
  label: string;
  value: number | null;
  points: SeriesPoint[];
  chartLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-ink-faint text-xs">{label}</p>
        <p className="text-ink mt-1 text-2xl font-semibold tracking-[-0.03em] tabular-nums">
          {value !== null ? value.toLocaleString() : "—"}
        </p>
        <p className="text-ink-faint mt-1 text-xs">Rolling 24-hour total</p>
      </div>
      <DeltaChart points={points} label={chartLabel} />
    </div>
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

  let noteVolumeSeries: SeriesPoint[] = [];
  let activeAuthorsSeries: SeriesPoint[] = [];
  let relayEventsSeries: SeriesPoint[] = [];
  let computedAt: string | null = null;

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
      getRelayStats("shortTtl", window),
      getStatsSeries("note_volume", window, "shortTtl"),
      getStatsSeries("active_authors", window, "shortTtl"),
      getStatsSeries("relay_events", window, "shortTtl"),
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
        typeof networkResult.computed_at === "string" &&
        networkResult.computed_at) ||
      null;
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Failed to load stats.");
  }
  const semantics = extractNativeApiSemantics(network, content, relays);
  const windowPhrase = window === "7d" ? "7 days" : "24 hours";
  const authors =
    readStatNumber(network, [`active_authors_${window}`]) ?? latestValue(activeAuthorsSeries);
  const noteVolume =
    readStatNumber(network, [`note_volume_${window}`]) ?? latestValue(noteVolumeSeries);
  const eventsIngested = readStatNumber(content, ["events_ingested"]);
  const profiles = readStatNumber(content, ["projected_profiles"]);
  const relaysIndexed = readStatNumber(relays, [`active_${window}`, `relays_active_${window}`]);
  const relayUrls = readStatNumber(relays, ["total", "relays_total"]);
  const relayEvents =
    readStatNumber(relays, [`event_volume_${window}`, `relays_event_volume_${window}`]) ??
    latestValue(relayEventsSeries);
  const relayAuthors = readStatNumber(relays, [`unique_authors_${window}`]);

  return (
    <div className="space-y-8">
      <LiveRefresh />
      <PageHero
        eyebrow="Statistics"
        title="How the index is moving."
        subtitle={`Note volume and authors over the last ${windowPhrase}, and how those rolling totals change from one sample to the next.`}
        badges={
          <WindowSelector path="/stats" searchParams={currentSearchParams} activeWindow={window} />
        }
      />
      <NetworkNav active="stats" />
      <IndexedAt computedAt={computedAt} />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

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
              label={`Relays indexed (${window})`}
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
              label={`Events from relays (${window})`}
              value={relayEvents}
              description="Event volume reported by relay stats for this window."
            />
          ) : null}
          {relayAuthors !== null ? (
            <StatCard
              plain
              label={`Authors on relays (${window})`}
              value={relayAuthors}
              description="Authors seen on a relay, any event kind. This is not the note-author count above."
            />
          ) : null}
        </div>
        <div className="mt-6">
          <DeltaChart points={relayEventsSeries} label="Change in relay events" />
        </div>
      </SectionCard>

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
