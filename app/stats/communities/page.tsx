import Link from "@/components/app-link";
import type { Metadata } from "next";

import { StatCard, StatGrid } from "@/components/explorer/stat-card";
import { LiveRefresh } from "@/components/freshness/live-refresh";
import { StatsFrame } from "@/components/stats/stats-frame";
import { GroupStatsSection } from "@/components/stats/surface-sections";
import { SectionCard } from "@/components/ui/section-card";
import { LoadErrors } from "@/components/ui/status-panels";
import {
  getBadgeStats,
  getCurationSets,
  getGoals,
  getGroupStats,
  getPollStats,
} from "@/lib/api/endpoints";
import { communitiesHeadline } from "@/lib/stats/headlines";
import { settle } from "@/lib/stats/settle";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import { readStatsWindow } from "@/lib/search-params/window";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "Community stats",
  description: "Groups, polls, badges, live events, goals, and curation sets.",
  path: "/stats/communities",
});

export default async function CommunityStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const current = toUrlSearchParams(resolved);
  const window = readStatsWindow(resolved);
  const [groups, polls, badges, goals, curation] = await Promise.all([
    settle(getGroupStats(), "Group stats are unavailable."),
    settle(getPollStats(), "Poll stats are unavailable."),
    settle(getBadgeStats(), "Badge stats are unavailable."),
    settle(getGoals(), "Goals are unavailable."),
    settle(getCurationSets(), "Curation sets are unavailable."),
  ]);
  const errors = [groups, polls, badges, goals, curation].flatMap((result) =>
    result.error ? [result.error] : []
  );
  const goalCount = goals.value?.goals?.length;
  const curationCount = curation.value?.curation_sets?.length;

  return (
    <>
      <LiveRefresh />
      <StatsFrame
        path="/stats/communities"
        title="Groups and the lists around them."
        subtitle="Messages, polls, badges, goals, and curation sets on record."
        headline={communitiesHeadline(groups.value)}
        searchParams={current}
        window={window}
        toc={[
          { id: "groups", label: "Groups" },
          { id: "polls-badges", label: "Polls and badges" },
          { id: "around", label: "Around the network" },
        ]}
      >
        <LoadErrors errors={errors} />
        <GroupStatsSection data={groups.value} />
        <SectionCard
          id="polls-badges"
          title="Polls and badges"
          description="Indexed polls, votes, badge definitions, and awards."
        >
          <StatGrid>
            {typeof polls.value?.polls === "number" ? (
              <StatCard
                plain
                label="Polls"
                value={polls.value.polls}
                description="Polls on record."
              />
            ) : null}
            {typeof polls.value?.votes === "number" ? (
              <StatCard
                plain
                label="Votes"
                value={polls.value.votes}
                description="Votes cast on those polls."
              />
            ) : null}
            {typeof badges.value?.definitions === "number" ? (
              <StatCard
                plain
                label="Badge definitions"
                value={badges.value.definitions}
                description="Badge definitions on record."
              />
            ) : null}
            {typeof badges.value?.awards === "number" ? (
              <StatCard
                plain
                label="Badge awards"
                value={badges.value.awards}
                description="Badge awards on record."
              />
            ) : null}
          </StatGrid>
        </SectionCard>
        <SectionCard
          id="around"
          title="Around the network"
          description="Live events, zap goals, and curation sets have their own pages."
        >
          <StatGrid>
            {typeof goalCount === "number" ? (
              <StatCard
                plain
                label="Goals"
                value={goalCount}
                description="Zap goals currently listed."
              />
            ) : null}
            {typeof curationCount === "number" ? (
              <StatCard
                plain
                label="Curation sets"
                value={curationCount}
                description="Curation sets currently listed."
              />
            ) : null}
          </StatGrid>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <li>
              <Link href="/live" className="text-link">
                Live
              </Link>
            </li>
            <li>
              <Link href="/goals" className="text-link">
                Goals
              </Link>
            </li>
            <li>
              <Link href="/curation-sets" className="text-link">
                Curation sets
              </Link>
            </li>
            <li>
              <Link href="/polls" className="text-link">
                Polls
              </Link>
            </li>
          </ul>
        </SectionCard>
      </StatsFrame>
    </>
  );
}
