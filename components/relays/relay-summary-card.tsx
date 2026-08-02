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
    "last_error",
    "availability",
    "uptime",
    "latency_ms",
    "last_seen",
    "seen_at",
  ]
    .filter((key) => record[key] !== undefined && record[key] !== null && record[key] !== "")
    .map((key) => ({ label: key, value: record[key] }));

  return (
    <article className="border-edge bg-surface/60 space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <p className="text-ink text-sm font-medium">Relay summary</p>
        <IdBadge id={relayHost} label="relay" />
      </div>
      {summaryItems.length > 0 ? (
        <MetadataList items={summaryItems} columns={2} />
      ) : (
        <p className="text-ink-muted text-sm">
          Relay details were sparse in this response. Open debug details for the raw payload.
        </p>
      )}
    </article>
  );
}
