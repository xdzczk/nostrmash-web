import type { Metadata } from "next";

import { LiveRefresh } from "@/components/freshness/live-refresh";
import { StatsFrame } from "@/components/stats/stats-frame";
import { ModerationStatsSection, SpamStatsSection } from "@/components/stats/surface-sections";
import { LoadErrors } from "@/components/ui/status-panels";
import { getModerationStats, getSpamStats } from "@/lib/api/endpoints";
import { fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { moderationHeadline } from "@/lib/stats/headlines";
import { settle } from "@/lib/stats/settle";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import { readStatsWindow } from "@/lib/search-params/window";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "Moderation stats",
  description: "Reports and repeated content the index has grouped.",
  path: "/stats/moderation",
});

export default async function ModerationStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const current = toUrlSearchParams(resolved);
  const window = readStatsWindow(resolved);
  const [moderation, spam] = await Promise.all([
    settle(getModerationStats(), "Moderation stats are unavailable."),
    settle(getSpamStats(), "Spam stats are unavailable."),
  ]);
  const pubkeys = [
    ...(moderation.value?.most_reported ?? []).flatMap((target) => {
      const type = (target.target_type ?? "").toLowerCase();
      return type === "p" || type === "pubkey" ? [target.target_value] : [];
    }),
    ...(spam.value?.burst_authors ?? []).map((author) => author.pubkey),
  ];
  const profiles =
    pubkeys.length > 0 ? await fetchProfilesByPubkey(pubkeys, "shortTtl").catch(() => ({})) : {};
  const errors = [moderation, spam].flatMap((result) => (result.error ? [result.error] : []));

  return (
    <>
      <LiveRefresh />
      <StatsFrame
        path="/stats/moderation"
        title="What people reported."
        subtitle="Reports by type, the targets named most often, and repeated text."
        headline={moderationHeadline(moderation.value)}
        searchParams={current}
        window={window}
        toc={[
          { id: "moderation", label: "Moderation" },
          { id: "spam", label: "Spam" },
        ]}
      >
        <LoadErrors errors={errors} />
        <ModerationStatsSection data={moderation.value} profiles={profiles} />
        <SpamStatsSection data={spam.value} profiles={profiles} />
      </StatsFrame>
    </>
  );
}
