import Link from "@/components/app-link";

import {
  ContentShapeSection,
  ConversationStatsSection,
  DeletionStatsSection,
  EmojiStatsSection,
  GroupStatsSection,
  KindStatsSection,
  LabelStatsSection,
  MediaHostStatsSection,
  ModerationStatsSection,
  RelayListStatsSection,
  RelaySoftwareSection,
  SpamStatsSection,
  ZapHeatmapSection,
  ZapLeaderboardSection,
} from "@/components/stats/surface-sections";
import { StatCard } from "@/components/explorer/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel, LoadErrors } from "@/components/ui/status-panels";
import { ApiError } from "@/lib/api/errors";
import {
  getBadgeStats,
  getContentStats,
  getConversationStats,
  getDeletionStats,
  getEmojiStats,
  getGroupStats,
  getKindStats,
  getLabelStats,
  getMediaHostStats,
  getModerationStats,
  getPollStats,
  getRelayListStats,
  getRelaySoftwareStats,
  getSpamStats,
  getZapHeatmap,
  getZapLeaderboard,
  readContentShape,
} from "@/lib/api/endpoints";
import { fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { readSearchParam } from "@/lib/search-params/pagination";
import type { StatsWindow } from "@/lib/search-params/window";
import type { ZapLeaderboardRole } from "@/lib/types/surfaces";

function failure(error: unknown, fallback: string): string | null {
  if (error instanceof ApiError && error.isNotFound) return null;
  return toUserFacingErrorMessage(error, fallback);
}

function readZapRole(params: URLSearchParams): ZapLeaderboardRole {
  return readSearchParam(Object.fromEntries(params.entries()), "zap_role") === "sender"
    ? "sender"
    : "receiver";
}

export async function DiscoverySurfaceStats({
  window,
  searchParams,
}: {
  window: StatsWindow;
  searchParams: URLSearchParams;
}) {
  const role = readZapRole(searchParams);
  const [
    groups,
    kinds,
    conversations,
    deletions,
    moderation,
    spam,
    content,
    labels,
    emoji,
    media,
    software,
    relayLists,
    heatmap,
    leaderboard,
    polls,
    badges,
  ] = await Promise.allSettled([
    getGroupStats(),
    getKindStats(window),
    getConversationStats(),
    getDeletionStats(),
    getModerationStats(),
    getSpamStats(),
    getContentStats(),
    getLabelStats(),
    getEmojiStats(window),
    getMediaHostStats(),
    getRelaySoftwareStats(),
    getRelayListStats(),
    getZapHeatmap(),
    getZapLeaderboard(role, window),
    getPollStats(),
    getBadgeStats(),
  ]);

  const errors = [
    groups.status === "rejected" ? failure(groups.reason, "Group stats are unavailable.") : null,
    kinds.status === "rejected" ? failure(kinds.reason, "Kind stats are unavailable.") : null,
    conversations.status === "rejected"
      ? failure(conversations.reason, "Conversation stats are unavailable.")
      : null,
    deletions.status === "rejected"
      ? failure(deletions.reason, "Deletion stats are unavailable.")
      : null,
    moderation.status === "rejected"
      ? failure(moderation.reason, "Moderation stats are unavailable.")
      : null,
    spam.status === "rejected" ? failure(spam.reason, "Spam stats are unavailable.") : null,
    content.status === "rejected" ? failure(content.reason, "Content shape is unavailable.") : null,
    labels.status === "rejected" ? failure(labels.reason, "Label stats are unavailable.") : null,
    emoji.status === "rejected" ? failure(emoji.reason, "Emoji stats are unavailable.") : null,
    media.status === "rejected" ? failure(media.reason, "Media host stats are unavailable.") : null,
    software.status === "rejected"
      ? failure(software.reason, "Relay software stats are unavailable.")
      : null,
    relayLists.status === "rejected"
      ? failure(relayLists.reason, "Relay list stats are unavailable.")
      : null,
    heatmap.status === "rejected"
      ? failure(heatmap.reason, "The zap heatmap is unavailable.")
      : null,
    leaderboard.status === "rejected"
      ? failure(leaderboard.reason, "The zap leaderboard is unavailable.")
      : null,
    polls.status === "rejected" ? failure(polls.reason, "Poll stats are unavailable.") : null,
    badges.status === "rejected" ? failure(badges.reason, "Badge stats are unavailable.") : null,
  ];

  const board = leaderboard.status === "fulfilled" ? leaderboard.value : null;
  const pubkeys = (board?.items ?? []).map((item) => item.pubkey);
  const profiles =
    pubkeys.length > 0 ? await fetchProfilesByPubkey(pubkeys, "shortTtl").catch(() => ({})) : {};
  const pollStats = polls.status === "fulfilled" ? polls.value : null;
  const badgeStats = badges.status === "fulfilled" ? badges.value : null;

  return (
    <div className="space-y-8">
      <LoadErrors errors={errors} />
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/groups" className="text-link">
          Groups
        </Link>
        <Link href="/polls" className="text-link">
          Polls
        </Link>
        <Link href="/goals" className="text-link">
          Goals
        </Link>
        <Link href="/curation-sets" className="text-link">
          Curation sets
        </Link>
      </div>
      <GroupStatsSection data={groups.status === "fulfilled" ? groups.value : null} />
      <KindStatsSection data={kinds.status === "fulfilled" ? kinds.value : null} window={window} />
      <SectionCard
        title="Polls and badges"
        description="Indexed polls, votes, badge definitions, and awards."
      >
        {typeof pollStats?.polls !== "number" &&
        typeof pollStats?.votes !== "number" &&
        typeof badgeStats?.definitions !== "number" &&
        typeof badgeStats?.awards !== "number" ? (
          <p className="text-ink-muted text-sm">
            Poll and badge totals are empty until they are indexed.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {typeof pollStats?.polls === "number" ? (
              <StatCard plain label="Polls" value={pollStats.polls} />
            ) : null}
            {typeof pollStats?.votes === "number" ? (
              <StatCard plain label="Votes" value={pollStats.votes} />
            ) : null}
            {typeof badgeStats?.definitions === "number" ? (
              <StatCard plain label="Badge definitions" value={badgeStats.definitions} />
            ) : null}
            {typeof badgeStats?.awards === "number" ? (
              <StatCard plain label="Badge awards" value={badgeStats.awards} />
            ) : null}
          </div>
        )}
        {polls.status === "rejected" && errors[14] ? <ErrorPanel message={errors[14]} /> : null}
      </SectionCard>
      <ConversationStatsSection
        data={conversations.status === "fulfilled" ? conversations.value : null}
      />
      <DeletionStatsSection data={deletions.status === "fulfilled" ? deletions.value : null} />
      <ModerationStatsSection data={moderation.status === "fulfilled" ? moderation.value : null} />
      <SpamStatsSection
        data={spam.status === "rejected" ? null : spam.status === "fulfilled" ? spam.value : null}
      />
      <ContentShapeSection
        data={readContentShape(content.status === "fulfilled" ? content.value : null)}
      />
      <LabelStatsSection data={labels.status === "fulfilled" ? labels.value : null} />
      <EmojiStatsSection data={emoji.status === "fulfilled" ? emoji.value : null} window={window} />
      <MediaHostStatsSection data={media.status === "fulfilled" ? media.value : null} />
      <RelaySoftwareSection data={software.status === "fulfilled" ? software.value : null} />
      <RelayListStatsSection data={relayLists.status === "fulfilled" ? relayLists.value : null} />
      <ZapHeatmapSection data={heatmap.status === "fulfilled" ? heatmap.value : null} />
      <ZapLeaderboardSection
        items={board?.items ?? []}
        profiles={profiles}
        role={role}
        window={window}
        searchParams={searchParams}
      />
    </div>
  );
}
