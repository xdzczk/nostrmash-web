import { NetworkPulseStrip } from "@/components/home/network-pulse-strip";
import { pickTopPrimitiveStats } from "@/components/explorer/stats-utils";
import { getNetworkStats } from "@/lib/api/endpoints";
import { networkPulsePreferredKeys, type StatsWindow } from "@/lib/search-params/window";

export async function DeferredNetworkPulse({
  window,
  seedStats,
}: {
  window: StatsWindow;
  seedStats: Array<{ label: string; value: string | number | boolean }>;
}) {
  if (seedStats.length > 0) {
    return <NetworkPulseStrip title="Network pulse" stats={seedStats} />;
  }

  let stats: Array<{ label: string; value: string | number | boolean }> = [];
  try {
    const networkStats = await getNetworkStats("shortTtl");
    stats = pickTopPrimitiveStats(networkStats ?? {}, networkPulsePreferredKeys(window), 6, window);
  } catch {
    stats = [];
  }

  return <NetworkPulseStrip title="Network pulse" stats={stats} />;
}
