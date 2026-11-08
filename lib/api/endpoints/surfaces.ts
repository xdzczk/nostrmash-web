import { fetchApiJson } from "@/lib/api/http";
import { coverageNotesFromChanges, type CoverageNote } from "@/lib/stats/coverage-notes";
import {
  normalizeBadge,
  normalizeBadgeStats,
  normalizeContentShape,
  normalizeConversationStats,
  normalizeCurationSet,
  normalizeCurationSets,
  normalizeDeletionStats,
  normalizeEmojiStats,
  normalizeEmergingDomains,
  normalizeEmergingHashtags,
  normalizeEventGoal,
  normalizeEventLabels,
  normalizeEventPoll,
  normalizeExternalIdentities,
  normalizeGoals,
  normalizeGroupDetail,
  normalizeGroupMessages,
  normalizeGroupStats,
  normalizeGroups,
  normalizeHashtagHistory,
  normalizeKindStats,
  normalizeLabelStats,
  normalizeLiveChat,
  normalizeMediaHostStats,
  normalizeModerationStats,
  normalizePolls,
  normalizePollStats,
  normalizeProfileBadges,
  normalizeProfileInterests,
  normalizeProfileLabels,
  normalizeProfileLists,
  normalizeProfileModeration,
  normalizeProfileStatus,
  normalizeRelayHealthHistory,
  normalizeRelayListStats,
  normalizeRelaySoftwareStats,
  normalizeSpamStats,
  normalizeZapHeatmap,
  normalizeZapLeaderboard,
} from "@/lib/api/normalize/surfaces";
import { nativeApiV1Routes, withPubkeyCandidates } from "@/lib/api/endpoints/shared";
import type { CacheClass } from "@/lib/caching/policies";
import type { StatsWindow } from "@/lib/search-params/window";
import type {
  BadgeResponse,
  BadgeStatsResponse,
  ContentShapeStats,
  ConversationStatsResponse,
  CurationSetDetail,
  CurationSetsResponse,
  DeletionStatsResponse,
  EmojiStatsResponse,
  EmergingDomainsResponse,
  EmergingHashtagsResponse,
  EventGoalResponse,
  EventLabelsResponse,
  EventPollResponse,
  ExternalIdentitiesResponse,
  GoalsResponse,
  GroupDetail,
  GroupMessagesResponse,
  GroupSort,
  GroupStatsResponse,
  GroupsResponse,
  HashtagHistoryResponse,
  KindStatsResponse,
  LabelStatsResponse,
  LiveChatResponse,
  MediaHostStatsResponse,
  ModerationStatsResponse,
  PollSort,
  PollStatsResponse,
  PollsResponse,
  ProfileBadgesResponse,
  ProfileInterestsResponse,
  ProfileLabelsResponse,
  ProfileListsResponse,
  ProfileModerationResponse,
  ProfileStatusResponse,
  RelayHealthHistoryResponse,
  RelayListStatsResponse,
  RelaySoftwareStatsResponse,
  SpamStatsResponse,
  ZapHeatmapResponse,
  ZapLeaderboardResponse,
  ZapLeaderboardRole,
} from "@/lib/types/surfaces";

const cache = "shortTtl" satisfies CacheClass;

function windowQuery(window?: StatsWindow) {
  return window ? { window } : undefined;
}

export async function getEventLabels(eventId: string): Promise<EventLabelsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.eventLabels(eventId), {
    cacheClass: cache,
  });
  return normalizeEventLabels(response);
}

export async function getEventPoll(eventId: string): Promise<EventPollResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.eventPoll(eventId), {
    cacheClass: cache,
  });
  return normalizeEventPoll(response);
}

export async function getEventGoal(eventId: string): Promise<EventGoalResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.eventGoal(eventId), {
    cacheClass: cache,
  });
  return normalizeEventGoal(response);
}

export async function getGroups(sort: GroupSort = "active"): Promise<GroupsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.groups, {
    cacheClass: cache,
    query: { sort },
  });
  return normalizeGroups(response);
}

export async function getGroup(relayHost: string, groupId: string): Promise<GroupDetail> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.group(relayHost, groupId), {
    cacheClass: cache,
  });
  return normalizeGroupDetail(response);
}

export async function getGroupMessages(
  relayHost: string,
  groupId: string
): Promise<GroupMessagesResponse> {
  const response = await fetchApiJson<unknown>(
    nativeApiV1Routes.groupMessages(relayHost, groupId),
    { cacheClass: cache }
  );
  return normalizeGroupMessages(response);
}

export async function getRelayGroups(relayHost: string): Promise<GroupsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.relayGroups(relayHost), {
    cacheClass: cache,
  });
  return normalizeGroups(response);
}

export async function getGroupStats(): Promise<GroupStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.groupStats, { cacheClass: cache });
  return normalizeGroupStats(response);
}

export async function getLiveChat(address: string): Promise<LiveChatResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.liveChat(address), {
    cacheClass: cache,
  });
  return normalizeLiveChat(response);
}

export async function getPolls(sort: PollSort = "recent"): Promise<PollsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.polls, {
    cacheClass: cache,
    query: { sort },
  });
  return normalizePolls(response);
}

export async function getPollStats(): Promise<PollStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.pollStats, { cacheClass: cache });
  return normalizePollStats(response);
}

export async function getProfileBadges(pubkey: string): Promise<ProfileBadgesResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<unknown>(nativeApiV1Routes.profileBadges(candidate), {
        cacheClass: cache,
      });
      return normalizeProfileBadges(response);
    },
    "Badge lookup failed."
  );
}

export async function getBadge(address: string): Promise<BadgeResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.badge(address), {
    cacheClass: cache,
  });
  return normalizeBadge(response);
}

export async function getBadgeStats(): Promise<BadgeStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.badgeStats, { cacheClass: cache });
  return normalizeBadgeStats(response);
}

export async function getGoals(): Promise<GoalsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.goals, { cacheClass: cache });
  return normalizeGoals(response);
}

export async function getProfileStatus(pubkey: string): Promise<ProfileStatusResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<unknown>(nativeApiV1Routes.profileStatus(candidate), {
        cacheClass: cache,
      });
      return normalizeProfileStatus(response);
    },
    "Status lookup failed."
  );
}

export async function getCurationSets(): Promise<CurationSetsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.curationSets, {
    cacheClass: cache,
  });
  return normalizeCurationSets(response);
}

export async function getCurationSet(address: string): Promise<CurationSetDetail> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.curationSet(address), {
    cacheClass: cache,
  });
  return normalizeCurationSet(response);
}

export async function getProfileInterests(pubkey: string): Promise<ProfileInterestsResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<unknown>(nativeApiV1Routes.profileInterests(candidate), {
        cacheClass: cache,
      });
      return normalizeProfileInterests(response);
    },
    "Interest lookup failed."
  );
}

export async function getProfileLists(pubkey: string): Promise<ProfileListsResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<unknown>(nativeApiV1Routes.profileLists(candidate), {
        cacheClass: cache,
      });
      return normalizeProfileLists(response);
    },
    "List lookup failed."
  );
}

export async function getProfileLabels(pubkey: string): Promise<ProfileLabelsResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<unknown>(nativeApiV1Routes.profileLabels(candidate), {
        cacheClass: cache,
      });
      return normalizeProfileLabels(response);
    },
    "Label lookup failed."
  );
}

export async function getProfileExternalIdentities(
  pubkey: string
): Promise<ExternalIdentitiesResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<unknown>(
        nativeApiV1Routes.profileExternalIdentities(candidate),
        { cacheClass: cache }
      );
      return normalizeExternalIdentities(response);
    },
    "Identity lookup failed."
  );
}

export async function getProfileModeration(pubkey: string): Promise<ProfileModerationResponse> {
  return withPubkeyCandidates(
    pubkey,
    async (candidate) => {
      const response = await fetchApiJson<unknown>(nativeApiV1Routes.profileModeration(candidate), {
        cacheClass: cache,
      });
      return normalizeProfileModeration(response);
    },
    "Moderation lookup failed."
  );
}

export async function getKindStats(window: StatsWindow = "7d"): Promise<KindStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.kindStats, {
    cacheClass: cache,
    query: windowQuery(window),
  });
  return normalizeKindStats(response);
}

export async function getConversationStats(): Promise<ConversationStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.conversationStats, {
    cacheClass: cache,
  });
  return normalizeConversationStats(response);
}

export async function getZapLeaderboard(
  role: ZapLeaderboardRole = "receiver",
  window: StatsWindow = "7d"
): Promise<ZapLeaderboardResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.zapLeaderboard, {
    cacheClass: cache,
    query: { role, window },
  });
  return normalizeZapLeaderboard(response);
}

export async function getZapHeatmap(): Promise<ZapHeatmapResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.zapHeatmap, { cacheClass: cache });
  return normalizeZapHeatmap(response);
}

export async function getEmergingHashtags(): Promise<EmergingHashtagsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.emergingHashtags, {
    cacheClass: cache,
  });
  return normalizeEmergingHashtags(response);
}

export async function getEmergingDomains(): Promise<EmergingDomainsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.emergingDomains, {
    cacheClass: cache,
  });
  return normalizeEmergingDomains(response);
}

export async function getDiscoveryArchiveDays(limit = 30): Promise<string[]> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.discoveryArchive, {
    cacheClass: cache,
    query: { limit },
  });
  const days =
    response && typeof response === "object" && "days" in response
      ? (response as { days?: unknown }).days
      : undefined;
  if (!Array.isArray(days)) return [];
  return days.filter(
    (day): day is string => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)
  );
}

export async function getDiscoveryArchive(date: string): Promise<unknown> {
  return fetchApiJson<unknown>(
    `${nativeApiV1Routes.discoveryArchive}/${encodeURIComponent(date)}`,
    { cacheClass: cache }
  );
}

export async function getRelayCoverageChanges(limit = 50): Promise<CoverageNote[]> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.relayCoverageChanges, {
    cacheClass: cache,
    query: { limit },
  });
  return coverageNotesFromChanges(response);
}

export async function getHashtagHistory(tag: string): Promise<HashtagHistoryResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.hashtagHistory(tag), {
    cacheClass: cache,
  });
  return normalizeHashtagHistory(response);
}

export async function getDeletionStats(): Promise<DeletionStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.deletionStats, {
    cacheClass: cache,
  });
  return normalizeDeletionStats(response);
}

export async function getModerationStats(): Promise<ModerationStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.moderationStats, {
    cacheClass: cache,
  });
  return normalizeModerationStats(response);
}

export async function getSpamStats(): Promise<SpamStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.spamStats, { cacheClass: cache });
  return normalizeSpamStats(response);
}

export async function getRelayListStats(): Promise<RelayListStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.relayListStats, {
    cacheClass: cache,
  });
  return normalizeRelayListStats(response);
}

export async function getRelayHealthHistory(
  relayHost: string
): Promise<RelayHealthHistoryResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.relayHealthHistory(relayHost), {
    cacheClass: cache,
  });
  return normalizeRelayHealthHistory(response);
}

export async function getRelaySoftwareStats(): Promise<RelaySoftwareStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.relaySoftwareStats, {
    cacheClass: cache,
  });
  return normalizeRelaySoftwareStats(response);
}

export async function getMediaHostStats(): Promise<MediaHostStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.mediaHostStats, {
    cacheClass: cache,
  });
  return normalizeMediaHostStats(response);
}

export async function getLabelStats(): Promise<LabelStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.labelStats, { cacheClass: cache });
  return normalizeLabelStats(response);
}

export async function getEmojiStats(window: StatsWindow = "7d"): Promise<EmojiStatsResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.emojiStats, {
    cacheClass: cache,
    query: windowQuery(window),
  });
  return normalizeEmojiStats(response);
}

export function readContentShape(value: unknown): ContentShapeStats {
  return normalizeContentShape(value);
}
