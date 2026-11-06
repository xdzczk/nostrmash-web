import Link from "@/components/app-link";
import type { Metadata } from "next";

import { readStatNumber } from "@/components/explorer/stats-utils";
import { LiveRefresh } from "@/components/freshness/live-refresh";
import { RelayIndexSection } from "@/components/stats/relay-index-section";
import { StatsFrame } from "@/components/stats/stats-frame";
import { RelayListStatsSection, RelaySoftwareSection } from "@/components/stats/surface-sections";
import { LoadErrors } from "@/components/ui/status-panels";
import {
  getRelayListStats,
  getRelaySoftwareStats,
  getRelayStats,
  getStatsSeries,
  normalizeSeriesPoints,
} from "@/lib/api/endpoints";
import { relaysHeadline } from "@/lib/stats/headlines";
import { settle } from "@/lib/stats/settle";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import {
  formatStatsWindowSpan,
  readStatsWindow,
  relayStatsWindow,
} from "@/lib/search-params/window";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "Relay stats",
  description: "Relays this index reads, the software they run, and published relay lists.",
  path: "/stats/relays",
});

export default async function RelayStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const current = toUrlSearchParams(resolved);
  const window = readStatsWindow(resolved);
  const relayWindow = relayStatsWindow(window);
  const [relays, series, software, lists] = await Promise.all([
    settle(getRelayStats("shortTtl", window), "Failed to load relay stats."),
    settle(getStatsSeries("relay_events", window, "shortTtl"), "Failed to load relay series."),
    settle(getRelaySoftwareStats(), "Relay software stats are unavailable."),
    settle(getRelayListStats(), "Relay list stats are unavailable."),
  ]);
  const relaysIndexed = readStatNumber(relays.value, [
    `active_${relayWindow}`,
    `relays_active_${relayWindow}`,
  ]);
  const errors = [relays, series, software, lists].flatMap((result) =>
    result.error ? [result.error] : []
  );

  return (
    <>
      <LiveRefresh />
      <StatsFrame
        path="/stats/relays"
        title="Relays this index reads."
        subtitle={`Delivery, software, and published lists ${formatStatsWindowSpan(window)}.`}
        headline={relaysHeadline(relaysIndexed, window)}
        searchParams={current}
        window={window}
        toc={[
          { id: "relays-index", label: "This index" },
          { id: "relay-software", label: "Software" },
          { id: "relay-lists", label: "Relay lists" },
        ]}
      >
        <LoadErrors errors={errors} />
        <RelayIndexSection
          relayWindow={relayWindow}
          relaysIndexed={relaysIndexed}
          relayUrls={readStatNumber(relays.value, ["total", "relays_total"])}
          relayEvents={readStatNumber(relays.value, [
            `event_volume_${relayWindow}`,
            `relays_event_volume_${relayWindow}`,
          ])}
          relayAuthors={readStatNumber(relays.value, [`unique_authors_${relayWindow}`])}
          relayEventsSeries={normalizeSeriesPoints(series.value)}
        />
        <RelaySoftwareSection data={software.value} />
        <RelayListStatsSection data={lists.value} />
        <p className="text-sm">
          <Link href="/relays/health" className="text-link">
            Relay status
          </Link>
        </p>
      </StatsFrame>
    </>
  );
}
