import { IdBadge } from "@/components/explorer/id-badge";
import { MetadataList } from "@/components/explorer/metadata-list";
import { isRecord } from "@/components/explorer/utils";

export function RelaySummaryCard({
  relayHost,
  relayData,
}: {
  relayHost: string;
  relayData: unknown;
}) {
  const record = isRecord(relayData) ? relayData : {};
  const summaryItems = [
    "relay_url",
    "url",
    "host",
    "status",
    "healthy",
    "availability",
    "uptime",
    "latency_ms",
    "last_seen",
    "seen_at",
  ]
    .filter((key) => record[key] !== undefined && record[key] !== null && record[key] !== "")
    .map((key) => ({ label: key, value: record[key] }));

  return (
    <article className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-100">Relay summary</p>
        <IdBadge id={relayHost} label="relay" />
      </div>
      {summaryItems.length > 0 ? (
        <MetadataList items={summaryItems} columns={2} />
      ) : (
        <p className="text-sm text-zinc-400">
          Relay-level fields were sparse in the current payload. Open debug details for the raw
          response.
        </p>
      )}
    </article>
  );
}
