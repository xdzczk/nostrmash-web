import { DeltaChart } from "@/components/charts/delta-chart";
import type { SeriesPoint } from "@/components/charts/sparkline";
import { StatCard, StatGrid } from "@/components/explorer/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import type { RelayStatsWindow } from "@/lib/search-params/window";

export function RelayIndexSection({
  relayWindow,
  relaysIndexed,
  relayUrls,
  relayEvents,
  relayAuthors,
  relayEventsSeries,
}: {
  relayWindow: RelayStatsWindow;
  relaysIndexed: number | null;
  relayUrls: number | null;
  relayEvents: number | null;
  relayAuthors: number | null;
  relayEventsSeries: SeriesPoint[];
}) {
  return (
    <SectionCard
      id="relays-index"
      title="Relays this index reads"
      description="These counts are the index's own view. The public list of relays people publish is much larger, and lives under Popular relays."
    >
      <StatGrid>
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
            description="Authors seen on a relay, any event kind."
          />
        ) : null}
      </StatGrid>
      <div className="mt-6">
        <DeltaChart points={relayEventsSeries} label="Change in relay events" />
      </div>
    </SectionCard>
  );
}
