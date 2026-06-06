import { MetadataList } from "@/components/explorer/metadata-list";

export function RelayStatList({
  title,
  stats,
}: {
  title: string;
  stats: Array<{ label: string; value: unknown }>;
}) {
  if (stats.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-ink-soft text-sm font-medium">{title}</h3>
      <MetadataList items={stats} columns={2} />
    </section>
  );
}
