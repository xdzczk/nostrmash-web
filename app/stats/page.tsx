import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel, JsonPanel } from "@/components/ui/status-panels";
import { getContentStats, getNetworkStats, getRelayStats } from "@/lib/api/endpoints";

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

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Network stats</h1>
      </section>

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Network" description="Node-level and topology summary data.">
          <JsonPanel data={network ?? {}} />
        </SectionCard>
        <SectionCard title="Content" description="Aggregate content activity metrics.">
          <JsonPanel data={content ?? {}} />
        </SectionCard>
        <SectionCard title="Relays" description="Relay availability and health summaries.">
          <JsonPanel data={relays ?? {}} />
        </SectionCard>
      </div>
    </div>
  );
}
