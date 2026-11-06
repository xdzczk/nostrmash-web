import type { Metadata } from "next";

import { LiveRefresh } from "@/components/freshness/live-refresh";
import { ZapStatsSection } from "@/components/stats/ecosystem-sections";
import { StatsFrame } from "@/components/stats/stats-frame";
import { ZapHeatmapSection, ZapLeaderboardSection } from "@/components/stats/surface-sections";
import { LoadErrors } from "@/components/ui/status-panels";
import { getZapHeatmap, getZapLeaderboard, getZapStats } from "@/lib/api/endpoints";
import { fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { zapsHeadline } from "@/lib/stats/headlines";
import { settle } from "@/lib/stats/settle";
import { readSearchParam, toUrlSearchParams } from "@/lib/search-params/pagination";
import { formatStatsWindowSpan, readStatsWindow } from "@/lib/search-params/window";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import type { ZapLeaderboardRole } from "@/lib/types/surfaces";

export const metadata: Metadata = buildEntityMetadata({
  title: "Zap stats",
  description: "Zap volume, timing, and the people sending and receiving the most.",
  path: "/stats/zaps",
});

export default async function ZapStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const current = toUrlSearchParams(resolved);
  const window = readStatsWindow(resolved);
  const role: ZapLeaderboardRole =
    readSearchParam(resolved, "zap_role") === "sender" ? "sender" : "receiver";
  const [zaps, heatmap, leaderboard] = await Promise.all([
    settle(getZapStats("shortTtl", window), "Zap stats are unavailable."),
    settle(getZapHeatmap(), "The zap heatmap is unavailable."),
    settle(getZapLeaderboard(role, window), "The zap leaderboard is unavailable."),
  ]);
  const pubkeys = (leaderboard.value?.items ?? []).map((item) => item.pubkey);
  const profiles =
    pubkeys.length > 0 ? await fetchProfilesByPubkey(pubkeys, "shortTtl").catch(() => ({})) : {};
  const errors = [zaps, heatmap, leaderboard].flatMap((result) =>
    result.error ? [result.error] : []
  );

  return (
    <>
      <LiveRefresh />
      <StatsFrame
        path="/stats/zaps"
        title="How sats moved."
        subtitle={`Zap receipts ${formatStatsWindowSpan(window)}.`}
        headline={zapsHeadline(zaps.value, window)}
        searchParams={current}
        window={window}
        toc={[
          { id: "zaps", label: "Zaps" },
          { id: "zap-heatmap", label: "Zap timing" },
          { id: "zap-leaderboard", label: "Leaderboard" },
        ]}
      >
        <LoadErrors errors={errors} />
        <ZapStatsSection data={zaps.value} window={window} />
        <ZapHeatmapSection data={heatmap.value} />
        <ZapLeaderboardSection
          items={leaderboard.value?.items ?? []}
          profiles={profiles}
          role={role}
          window={window}
          searchParams={current}
        />
      </StatsFrame>
    </>
  );
}
