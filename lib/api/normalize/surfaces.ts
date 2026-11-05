import { asArray, asBoolean, asRecord, asString } from "@/lib/api/normalize/helpers";
import type { ProfileGraphStats } from "@/lib/types/surfaces";
import {
  CONTENT_LENGTH_BUCKETS,
  type AccountAgeBucket,
  type BadgeAward,
  type BadgeResponse,
  type BadgeStatsResponse,
  type BlossomServerCount,
  type BurstAuthor,
  type ContentLengthHistogram,
  type ContentShapeRow,
  type ContentShapeStats,
  type ConversationDay,
  type ConversationStatsResponse,
  type CurationSetDetail,
  type CurationSetItem,
  type CurationSetSummary,
  type CurationSetsResponse,
  type DeletionDay,
  type DeletionStatsResponse,
  type DuplicateCluster,
  type EmojiCount,
  type EmojiStatsResponse,
  type EmergingHashtagsResponse,
  type EventGoalResponse,
  type EventLabel,
  type EventLabelsResponse,
  type EventPollResponse,
  type ExternalIdentitiesResponse,
  type ExternalIdentity,
  type GoalsResponse,
  type GroupActivityDay,
  type GroupDetail,
  type GroupMessage,
  type GroupMessagesResponse,
  type GroupSizeBucket,
  type GroupStatsResponse,
  type GroupSummary,
  type GroupsResponse,
  type HashtagHistoryDay,
  type HashtagHistoryResponse,
  type HashtagMomentum,
  type HashtagMomentumStatus,
  type InterestList,
  type KindActivity,
  type KindEngagementRow,
  type KindFamilyStats,
  type KindStatsResponse,
  type LabelCount,
  type LabelStatsResponse,
  type LiveChatResponse,
  type MediaHostCount,
  type MediaHostStatsResponse,
  type ModerationStatsResponse,
  type PollCount,
  type PollOption,
  type PollStatsResponse,
  type PollSummary,
  type PollsResponse,
  type ProfileBadgesResponse,
  type ProfileInterestsResponse,
  type ProfileLabelsResponse,
  type ProfileListsResponse,
  type ProfileModerationResponse,
  type ProfileStatusResponse,
  type RelayHealthDay,
  type RelayHealthHistoryResponse,
  type RelayListDay,
  type RelayListStatsResponse,
  type RelayPreferenceList,
  type RelaySoftwareCount,
  type RelaySoftwareStatsResponse,
  type ReportDay,
  type ReportedTarget,
  type SpamStatsResponse,
  type UserStatus,
  type ZapGoal,
  type ZapHeatmapCell,
  type ZapHeatmapResponse,
  type ZapLeaderboardItem,
  type ZapLeaderboardResponse,
} from "@/lib/types/surfaces";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HEX_64 = /^[0-9a-f]{64}$/i;
const MOMENTUM = new Set<HashtagMomentumStatus>(["emerging", "fading", "steady"]);

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonNegative(value: unknown): number | undefined {
  const number = finite(value);
  if (number === undefined || number < 0) return undefined;
  return number;
}

function text(value: unknown): string | undefined {
  const raw = asString(value)?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

function dayString(value: unknown): string | undefined {
  return typeof value === "string" && DAY.test(value) ? value : undefined;
}

function hexPubkey(value: unknown): string | undefined {
  const raw = text(value);
  return raw && HEX_64.test(raw) ? raw.toLowerCase() : undefined;
}

function consistencyOf(record: Record<string, unknown>): string | undefined {
  return text(record.consistency);
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const item = text(entry);
      return item ? [item] : [];
    });
  }
  return [];
}

function lengthHistogram(value: unknown): ContentLengthHistogram | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const histogram: ContentLengthHistogram = {};
  for (const key of CONTENT_LENGTH_BUCKETS) {
    const count = nonNegative(record[key]);
    if (count !== undefined) histogram[key] = count;
  }
  return Object.keys(histogram).length > 0 ? histogram : undefined;
}

function addHistogram(target: ContentLengthHistogram, extra: ContentLengthHistogram | undefined) {
  if (!extra) return;
  for (const key of CONTENT_LENGTH_BUCKETS) {
    const count = extra[key];
    if (typeof count !== "number") continue;
    target[key] = (target[key] ?? 0) + count;
  }
}

export function normalizeProfileGraph(value: unknown): ProfileGraphStats | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const mutual = nonNegative(record.mutual_count);
  const reciprocity = nonNegative(record.reciprocity_bps);
  const followBack = nonNegative(record.follow_back_rate_bps);
  const ghost = nonNegative(record.ghost_follower_bps);
  if (
    mutual === undefined &&
    reciprocity === undefined &&
    followBack === undefined &&
    ghost === undefined
  ) {
    return undefined;
  }
  return {
    ...(mutual === undefined ? {} : { mutual_count: mutual }),
    ...(reciprocity === undefined ? {} : { reciprocity_bps: reciprocity }),
    ...(followBack === undefined ? {} : { follow_back_rate_bps: followBack }),
    ...(ghost === undefined ? {} : { ghost_follower_bps: ghost }),
  };
}

export function normalizeKindMix(value: unknown): Record<string, number> | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const mix: Record<string, number> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (!/^\d+$/.test(key)) continue;
    const count = nonNegative(raw);
    if (count !== undefined) mix[key] = count;
  }
  return Object.keys(mix).length > 0 ? mix : undefined;
}

function labelOf(value: unknown): EventLabel | null {
  const record = asRecord(value);
  const label = text(record?.label);
  if (!label) return null;
  const labeler = hexPubkey(record?.labeler_pubkey) ?? text(record?.labeler_pubkey);
  const namespace = text(record?.namespace);
  const self = asBoolean(record?.is_self);
  const targetType = text(record?.target_type);
  const targetValue = text(record?.target_value);
  const eventId = text(record?.event_id);
  return {
    label,
    ...(labeler ? { labeler_pubkey: labeler } : {}),
    ...(namespace ? { namespace } : {}),
    ...(self === undefined ? {} : { is_self: self }),
    ...(targetType ? { target_type: targetType } : {}),
    ...(targetValue ? { target_value: targetValue } : {}),
    ...(eventId ? { event_id: eventId } : {}),
  };
}

export function normalizeEventLabels(value: unknown): EventLabelsResponse {
  const record = asRecord(value) ?? {};
  const labels = asArray(record.labels).flatMap((entry) => {
    const label = labelOf(entry);
    return label ? [label] : [];
  });
  const consistency = consistencyOf(record);
  const eventId = text(record.event_id);
  return {
    ...(consistency ? { consistency } : {}),
    ...(eventId ? { event_id: eventId } : {}),
    ...(labels.length > 0 ? { labels } : {}),
  };
}

export function normalizeLabelStats(value: unknown): LabelStatsResponse {
  const record = asRecord(value) ?? {};
  const labels = asArray(record.labels).flatMap((entry): LabelCount[] => {
    const row = asRecord(entry);
    const namespace = text(row?.namespace) ?? "";
    const label = text(row?.label);
    if (!label) return [];
    const count = nonNegative(row?.count);
    return [{ namespace, label, ...(count === undefined ? {} : { count }) }];
  });
  const agreementRecord = asRecord(record.language_agreement);
  const agree = nonNegative(agreementRecord?.agree);
  const disagree = nonNegative(agreementRecord?.disagree);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(labels.length > 0 ? { labels } : {}),
    ...(agree !== undefined || disagree !== undefined
      ? {
          language_agreement: {
            ...(agree === undefined ? {} : { agree }),
            ...(disagree === undefined ? {} : { disagree }),
          },
        }
      : {}),
  };
}

export function normalizeEmojiStats(value: unknown): EmojiStatsResponse {
  const record = asRecord(value) ?? {};
  const emoji = asArray(record.emoji).flatMap((entry): EmojiCount[] => {
    const row = asRecord(entry);
    const shortcode = text(row?.shortcode);
    if (!shortcode) return [];
    const count = nonNegative(row?.count);
    return [{ shortcode, ...(count === undefined ? {} : { count }) }];
  });
  const window = text(record.window);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(window ? { window } : {}),
    ...(emoji.length > 0 ? { emoji } : {}),
  };
}

function groupSummary(value: unknown): GroupSummary | null {
  const record = asRecord(value);
  const relayUrl = text(record?.relay_url);
  const groupId = text(record?.group_id);
  if (!relayUrl || !groupId) return null;
  const name = text(record?.name);
  const about = text(record?.about);
  const isPublic = asBoolean(record?.is_public);
  const isOpen = asBoolean(record?.is_open);
  const admins = nonNegative(record?.admin_count);
  const members = nonNegative(record?.member_count);
  const messages = nonNegative(record?.messages_7d);
  return {
    relay_url: relayUrl,
    group_id: groupId,
    ...(name ? { name } : {}),
    ...(about ? { about } : {}),
    ...(isPublic === undefined ? {} : { is_public: isPublic }),
    ...(isOpen === undefined ? {} : { is_open: isOpen }),
    ...(admins === undefined ? {} : { admin_count: admins }),
    ...(members === undefined ? {} : { member_count: members }),
    ...(messages === undefined ? {} : { messages_7d: messages }),
  };
}

export function normalizeGroups(value: unknown): GroupsResponse {
  const record = asRecord(value) ?? {};
  const groups = asArray(record.groups).flatMap((entry) => {
    const group = groupSummary(entry);
    return group ? [group] : [];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(groups.length > 0 ? { groups } : {}),
  };
}

export function normalizeGroupDetail(value: unknown): GroupDetail {
  const record = asRecord(value) ?? {};
  const summary = groupSummary({ ...record, messages_7d: undefined });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(summary
      ? {
          relay_url: summary.relay_url,
          group_id: summary.group_id,
          ...(summary.name ? { name: summary.name } : {}),
          ...(summary.about ? { about: summary.about } : {}),
          ...(summary.is_public === undefined ? {} : { is_public: summary.is_public }),
          ...(summary.is_open === undefined ? {} : { is_open: summary.is_open }),
          ...(summary.admin_count === undefined ? {} : { admin_count: summary.admin_count }),
          ...(summary.member_count === undefined ? {} : { member_count: summary.member_count }),
        }
      : {}),
  };
}

export function normalizeGroupMessages(value: unknown): GroupMessagesResponse {
  const record = asRecord(value) ?? {};
  const messages = asArray(record.messages).flatMap((entry): GroupMessage[] => {
    const row = asRecord(entry);
    const eventId = text(row?.event_id);
    if (!eventId) return [];
    const author = hexPubkey(row?.author) ?? text(row?.author);
    const created = nonNegative(row?.created_at);
    const kind = nonNegative(row?.kind);
    return [
      {
        event_id: eventId,
        ...(author ? { author } : {}),
        ...(created === undefined ? {} : { created_at: created }),
        ...(kind === undefined ? {} : { kind }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(messages.length > 0 ? { messages } : {}),
  };
}

export function normalizeGroupStats(value: unknown): GroupStatsResponse {
  const record = asRecord(value) ?? {};
  const series = asArray(record.series).flatMap((entry): GroupActivityDay[] => {
    const row = asRecord(entry);
    const day = dayString(row?.day);
    if (!day) return [];
    const messages = nonNegative(row?.messages);
    const active = nonNegative(row?.active_groups);
    return [
      {
        day,
        ...(messages === undefined ? {} : { messages }),
        ...(active === undefined ? {} : { active_groups: active }),
      },
    ];
  });
  const histogram = asArray(record.size_histogram).flatMap((entry): GroupSizeBucket[] => {
    const row = asRecord(entry);
    const members = text(row?.members);
    if (!members) return [];
    const groups = nonNegative(row?.groups);
    return [{ members, ...(groups === undefined ? {} : { groups }) }];
  });
  const consistency = consistencyOf(record);
  const groups = nonNegative(record.groups);
  const active1 = nonNegative(record.active_groups_1d);
  const active7 = nonNegative(record.active_groups_7d);
  const messages = nonNegative(record.messages_1d);
  return {
    ...(consistency ? { consistency } : {}),
    ...(groups === undefined ? {} : { groups }),
    ...(active1 === undefined ? {} : { active_groups_1d: active1 }),
    ...(active7 === undefined ? {} : { active_groups_7d: active7 }),
    ...(messages === undefined ? {} : { messages_1d: messages }),
    ...(series.length > 0 ? { series } : {}),
    ...(histogram.length > 0 ? { size_histogram: histogram } : {}),
  };
}

export function normalizeLiveChat(value: unknown): LiveChatResponse {
  const record = asRecord(value) ?? {};
  const consistency = consistencyOf(record);
  const address = text(record.address);
  const chats = nonNegative(record.chat_count);
  const chatters = nonNegative(record.unique_chatters);
  const last = nonNegative(record.last_chat_at);
  return {
    ...(consistency ? { consistency } : {}),
    ...(address ? { address } : {}),
    ...(chats === undefined ? {} : { chat_count: chats }),
    ...(chatters === undefined ? {} : { unique_chatters: chatters }),
    ...(last === undefined ? {} : { last_chat_at: last }),
  };
}

function pollOptions(value: unknown): PollOption[] {
  return asArray(value).flatMap((entry): PollOption[] => {
    if (typeof entry === "string" && entry.trim()) {
      const label = entry.trim();
      return [{ id: label, label }];
    }
    const record = asRecord(entry);
    const id = text(record?.id) ?? text(record?.option_id);
    const label = text(record?.label) ?? id;
    if (!id || !label) return [];
    return [{ id, label }];
  });
}

export function normalizeEventPoll(value: unknown): EventPollResponse {
  const record = asRecord(value) ?? {};
  const options = pollOptions(record.options);
  const counts = asArray(record.counts).flatMap((entry): PollCount[] => {
    const row = asRecord(entry);
    const optionId = text(row?.option_id);
    if (!optionId) return [];
    const votes = nonNegative(row?.votes);
    return [{ option_id: optionId, ...(votes === undefined ? {} : { votes }) }];
  });
  const consistency = consistencyOf(record);
  const eventId = text(record.event_id);
  const author = hexPubkey(record.author);
  const question = text(record.question);
  const pollType = text(record.poll_type);
  return {
    ...(consistency ? { consistency } : {}),
    ...(eventId ? { event_id: eventId } : {}),
    ...(author ? { author } : {}),
    ...(question ? { question } : {}),
    ...(pollType ? { poll_type: pollType } : {}),
    ...(options.length > 0 ? { options } : {}),
    ...(counts.length > 0 ? { counts } : {}),
  };
}

export function normalizePolls(value: unknown): PollsResponse {
  const record = asRecord(value) ?? {};
  const polls = asArray(record.polls).flatMap((entry): PollSummary[] => {
    const row = asRecord(entry);
    const eventId = text(row?.event_id);
    if (!eventId) return [];
    const author = hexPubkey(row?.author);
    const question = text(row?.question);
    const pollType = text(row?.poll_type);
    const votes = nonNegative(row?.votes);
    return [
      {
        event_id: eventId,
        ...(author ? { author } : {}),
        ...(question ? { question } : {}),
        ...(pollType ? { poll_type: pollType } : {}),
        ...(votes === undefined ? {} : { votes }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(polls.length > 0 ? { polls } : {}),
  };
}

export function normalizePollStats(value: unknown): PollStatsResponse {
  const record = asRecord(value) ?? {};
  const polls = nonNegative(record.polls);
  const votes = nonNegative(record.votes);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(polls === undefined ? {} : { polls }),
    ...(votes === undefined ? {} : { votes }),
  };
}

export function normalizeProfileBadges(value: unknown): ProfileBadgesResponse {
  const record = asRecord(value) ?? {};
  const awards = asArray(record.awards).flatMap((entry): BadgeAward[] => {
    const row = asRecord(entry);
    const address = text(row?.address);
    if (!address) return [];
    const awarded = nonNegative(row?.awarded_at);
    return [{ address, ...(awarded === undefined ? {} : { awarded_at: awarded }) }];
  });
  const accepted = stringList(record.accepted);
  const consistency = consistencyOf(record);
  const pubkey = hexPubkey(record.pubkey);
  return {
    ...(consistency ? { consistency } : {}),
    ...(pubkey ? { pubkey } : {}),
    ...(awards.length > 0 ? { awards } : {}),
    ...(accepted.length > 0 ? { accepted } : {}),
  };
}

export function normalizeBadge(value: unknown): BadgeResponse {
  const record = asRecord(value) ?? {};
  const consistency = consistencyOf(record);
  const address = text(record.address);
  const issuer = hexPubkey(record.issuer);
  const name = text(record.name);
  const description = text(record.description);
  const image = text(record.image);
  const awards = nonNegative(record.awards);
  return {
    ...(consistency ? { consistency } : {}),
    ...(address ? { address } : {}),
    ...(issuer ? { issuer } : {}),
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(awards === undefined ? {} : { awards }),
  };
}

export function normalizeBadgeStats(value: unknown): BadgeStatsResponse {
  const record = asRecord(value) ?? {};
  const definitions = nonNegative(record.definitions);
  const awards = nonNegative(record.awards);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(definitions === undefined ? {} : { definitions }),
    ...(awards === undefined ? {} : { awards }),
  };
}

function zapGoal(value: unknown): ZapGoal | null {
  const record = asRecord(value);
  const eventId = text(record?.event_id);
  if (!eventId) return null;
  const author = hexPubkey(record?.author);
  const amount = nonNegative(record?.amount_msats);
  const raised = nonNegative(record?.raised_sats);
  const summary = text(record?.summary);
  return {
    event_id: eventId,
    ...(author ? { author } : {}),
    ...(amount === undefined ? {} : { amount_msats: amount }),
    ...(raised === undefined ? {} : { raised_sats: raised }),
    ...(summary ? { summary } : {}),
  };
}

export function normalizeEventGoal(value: unknown): EventGoalResponse {
  const record = asRecord(value) ?? {};
  const goal = zapGoal(record);
  const consistency = consistencyOf(record);
  const eventId = text(record.event_id);
  return {
    ...(consistency ? { consistency } : {}),
    ...(goal ?? (eventId ? { event_id: eventId } : {})),
  };
}

export function normalizeGoals(value: unknown): GoalsResponse {
  const record = asRecord(value) ?? {};
  const goals = asArray(record.goals).flatMap((entry) => {
    const goal = zapGoal(entry);
    return goal ? [goal] : [];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(goals.length > 0 ? { goals } : {}),
  };
}

export function normalizeProfileStatus(value: unknown): ProfileStatusResponse {
  const record = asRecord(value) ?? {};
  const statuses = asArray(record.statuses).flatMap((entry): UserStatus[] => {
    const row = asRecord(entry);
    if (!row) return [];
    const content = text(row.content);
    const link = text(row.link);
    const dTag = typeof row.d_tag === "string" ? row.d_tag : undefined;
    const expires = nonNegative(row.expires_at);
    if (!content && !link && dTag === undefined && expires === undefined) return [];
    return [
      {
        ...(dTag !== undefined ? { d_tag: dTag } : {}),
        ...(content ? { content } : {}),
        ...(link ? { link } : {}),
        ...(expires === undefined ? {} : { expires_at: expires }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  const pubkey = hexPubkey(record.pubkey);
  return {
    ...(consistency ? { consistency } : {}),
    ...(pubkey ? { pubkey } : {}),
    ...(statuses.length > 0 ? { statuses } : {}),
  };
}

function curationSummary(value: unknown): CurationSetSummary | null {
  const record = asRecord(value);
  const address = text(record?.address);
  if (!address) return null;
  const author = hexPubkey(record?.author);
  const kind = nonNegative(record?.kind);
  const title = text(record?.title);
  const items = nonNegative(record?.item_count);
  return {
    address,
    ...(author ? { author } : {}),
    ...(kind === undefined ? {} : { kind }),
    ...(title ? { title } : {}),
    ...(items === undefined ? {} : { item_count: items }),
  };
}

export function normalizeCurationSets(value: unknown): CurationSetsResponse {
  const record = asRecord(value) ?? {};
  const sets = asArray(record.curation_sets).flatMap((entry) => {
    const set = curationSummary(entry);
    return set ? [set] : [];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(sets.length > 0 ? { curation_sets: sets } : {}),
  };
}

export function normalizeCurationSet(value: unknown): CurationSetDetail {
  const record = asRecord(value) ?? {};
  const summary = curationSummary(record);
  const description = text(record.description);
  const items = asArray(record.items).flatMap((entry): CurationSetItem[] => {
    const row = asRecord(entry);
    const type = text(row?.type);
    const itemValue = text(row?.value);
    if (!type || !itemValue) return [];
    return [{ type, value: itemValue }];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(summary ?? {}),
    ...(description ? { description } : {}),
    ...(items.length > 0 ? { items } : {}),
  };
}

export function normalizeProfileInterests(value: unknown): ProfileInterestsResponse {
  const record = asRecord(value) ?? {};
  const interests = asArray(record.interests).flatMap((entry): InterestList[] => {
    const row = asRecord(entry);
    if (!row) return [];
    const kind = nonNegative(row.kind);
    const hashtags = stringList(row.hashtags);
    if (kind === undefined && hashtags.length === 0) return [];
    return [
      {
        ...(kind === undefined ? {} : { kind }),
        ...(hashtags.length > 0 ? { hashtags } : {}),
      },
    ];
  });
  const consistency = consistencyOf(record);
  const pubkey = hexPubkey(record.pubkey);
  return {
    ...(consistency ? { consistency } : {}),
    ...(pubkey ? { pubkey } : {}),
    ...(interests.length > 0 ? { interests } : {}),
  };
}

export function normalizeProfileLists(value: unknown): ProfileListsResponse {
  const record = asRecord(value) ?? {};
  const lists = asArray(record.lists).flatMap((entry): RelayPreferenceList[] => {
    const row = asRecord(entry);
    if (!row) return [];
    const kind = nonNegative(row.kind);
    const relays = stringList(row.relays);
    if (kind === undefined && relays.length === 0) return [];
    return [
      {
        ...(kind === undefined ? {} : { kind }),
        ...(relays.length > 0 ? { relays } : {}),
      },
    ];
  });
  const consistency = consistencyOf(record);
  const pubkey = hexPubkey(record.pubkey);
  return {
    ...(consistency ? { consistency } : {}),
    ...(pubkey ? { pubkey } : {}),
    ...(lists.length > 0 ? { lists } : {}),
  };
}

export function normalizeProfileLabels(value: unknown): ProfileLabelsResponse {
  const record = asRecord(value) ?? {};
  const labels = asArray(record.labels).flatMap((entry) => {
    const label = labelOf(entry);
    return label ? [label] : [];
  });
  const consistency = consistencyOf(record);
  const pubkey = hexPubkey(record.pubkey);
  return {
    ...(consistency ? { consistency } : {}),
    ...(pubkey ? { pubkey } : {}),
    ...(labels.length > 0 ? { labels } : {}),
  };
}

export function normalizeExternalIdentities(value: unknown): ExternalIdentitiesResponse {
  const record = asRecord(value) ?? {};
  const identities = asArray(record.identities).flatMap((entry): ExternalIdentity[] => {
    const row = asRecord(entry);
    const platform = text(row?.platform);
    if (!platform) return [];
    const identity = text(row?.identity);
    const proof = text(row?.proof);
    return [
      {
        platform,
        ...(identity ? { identity } : {}),
        ...(proof ? { proof } : {}),
      },
    ];
  });
  const consistency = consistencyOf(record);
  const pubkey = hexPubkey(record.pubkey);
  return {
    ...(consistency ? { consistency } : {}),
    ...(pubkey ? { pubkey } : {}),
    ...(identities.length > 0 ? { identities } : {}),
  };
}

export function normalizeKindStats(value: unknown): KindStatsResponse {
  const record = asRecord(value) ?? {};
  const families = asArray(record.families).flatMap((entry): KindFamilyStats[] => {
    const row = asRecord(entry);
    const family = text(row?.family);
    if (!family) return [];
    const eventCount = nonNegative(row?.event_count);
    const kinds = asArray(row?.kinds).flatMap((kindEntry): KindActivity[] => {
      const kindRow = asRecord(kindEntry);
      const kind = nonNegative(kindRow?.kind);
      if (kind === undefined) return [];
      const count = nonNegative(kindRow?.event_count);
      const authors = nonNegative(kindRow?.unique_authors);
      return [
        {
          kind,
          ...(count === undefined ? {} : { event_count: count }),
          ...(authors === undefined ? {} : { unique_authors: authors }),
        },
      ];
    });
    return [
      {
        family,
        ...(eventCount === undefined ? {} : { event_count: eventCount }),
        ...(kinds.length > 0 ? { kinds } : {}),
      },
    ];
  });
  const consistency = consistencyOf(record);
  const window = text(record.window);
  return {
    ...(consistency ? { consistency } : {}),
    ...(window ? { window } : {}),
    ...(families.length > 0 ? { families } : {}),
  };
}

export function normalizeConversationStats(value: unknown): ConversationStatsResponse {
  const record = asRecord(value) ?? {};
  const series = asArray(record.series).flatMap((entry): ConversationDay[] => {
    const row = asRecord(entry);
    const day = dayString(row?.day);
    if (!day) return [];
    const threads = nonNegative(row?.threads);
    const latency = nonNegative(row?.p50_first_reply_s);
    const depth = nonNegative(row?.avg_depth_x100);
    const branching = nonNegative(row?.avg_branching_x100);
    return [
      {
        day,
        ...(threads === undefined ? {} : { threads }),
        ...(latency === undefined ? {} : { p50_first_reply_s: latency }),
        ...(depth === undefined ? {} : { avg_depth_x100: depth }),
        ...(branching === undefined ? {} : { avg_branching_x100: branching }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(series.length > 0 ? { series } : {}),
  };
}

export function normalizeZapLeaderboard(value: unknown): ZapLeaderboardResponse {
  const record = asRecord(value) ?? {};
  const items = asArray(record.items).flatMap((entry): ZapLeaderboardItem[] => {
    const row = asRecord(entry);
    const pubkey = hexPubkey(row?.pubkey);
    if (!pubkey) return [];
    const sats = nonNegative(row?.sats);
    const count = nonNegative(row?.zap_count);
    return [
      {
        pubkey,
        ...(sats === undefined ? {} : { sats }),
        ...(count === undefined ? {} : { zap_count: count }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  const role = text(record.role);
  const window = text(record.window);
  return {
    ...(consistency ? { consistency } : {}),
    ...(role ? { role } : {}),
    ...(window ? { window } : {}),
    ...(items.length > 0 ? { items } : {}),
  };
}

export function normalizeZapHeatmap(value: unknown): ZapHeatmapResponse {
  const record = asRecord(value) ?? {};
  const cells = asArray(record.cells).flatMap((entry): ZapHeatmapCell[] => {
    const row = asRecord(entry);
    const day = nonNegative(row?.day_of_week);
    const hour = nonNegative(row?.hour);
    if (day === undefined || hour === undefined || day > 6 || hour > 23) return [];
    const count = nonNegative(row?.zap_count);
    const sats = nonNegative(row?.sats);
    return [
      {
        day_of_week: day,
        hour,
        ...(count === undefined ? {} : { zap_count: count }),
        ...(sats === undefined ? {} : { sats }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(cells.length > 0 ? { cells } : {}),
  };
}

export function normalizeEmergingHashtags(value: unknown): EmergingHashtagsResponse {
  const record = asRecord(value) ?? {};
  const items = asArray(record.items).flatMap((entry): HashtagMomentum[] => {
    const row = asRecord(entry);
    const hashtag = text(row?.hashtag)?.replace(/^#/, "").toLowerCase();
    if (!hashtag) return [];
    const score = finite(row?.z_score_7d);
    const statusRaw = text(row?.status);
    const status =
      statusRaw && MOMENTUM.has(statusRaw as HashtagMomentumStatus)
        ? (statusRaw as HashtagMomentumStatus)
        : undefined;
    return [
      {
        hashtag,
        ...(score === undefined ? {} : { z_score_7d: score }),
        ...(status ? { status } : {}),
      },
    ];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(items.length > 0 ? { items } : {}),
  };
}

export function normalizeHashtagHistory(value: unknown): HashtagHistoryResponse {
  const record = asRecord(value) ?? {};
  const series = asArray(record.series).flatMap((entry): HashtagHistoryDay[] => {
    const row = asRecord(entry);
    const day = dayString(row?.day);
    if (!day) return [];
    const events = nonNegative(row?.events);
    const authors = nonNegative(row?.authors);
    return [
      {
        day,
        ...(events === undefined ? {} : { events }),
        ...(authors === undefined ? {} : { authors }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  const hashtag = text(record.hashtag);
  return {
    ...(consistency ? { consistency } : {}),
    ...(hashtag ? { hashtag } : {}),
    ...(series.length > 0 ? { series } : {}),
  };
}

export function normalizeDeletionStats(value: unknown): DeletionStatsResponse {
  const record = asRecord(value) ?? {};
  const items = asArray(record.items).flatMap((entry): DeletionDay[] => {
    const row = asRecord(entry);
    const day = dayString(row?.day);
    if (!day) return [];
    const kind = nonNegative(row?.kind);
    const count = nonNegative(row?.count);
    const latency = nonNegative(row?.p50_time_to_delete_s);
    return [
      {
        day,
        ...(kind === undefined ? {} : { kind }),
        ...(count === undefined ? {} : { count }),
        ...(latency === undefined ? {} : { p50_time_to_delete_s: latency }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(items.length > 0 ? { items } : {}),
  };
}

export function normalizeModerationStats(value: unknown): ModerationStatsResponse {
  const record = asRecord(value) ?? {};
  const volume = asArray(record.volume ?? record.report_daily).flatMap((entry): ReportDay[] => {
    const row = asRecord(entry);
    const day = dayString(row?.day);
    if (!day) return [];
    const reportType = text(row?.report_type);
    const count = nonNegative(row?.count);
    return [
      {
        day,
        ...(reportType ? { report_type: reportType } : {}),
        ...(count === undefined ? {} : { count }),
      },
    ];
  });
  const reported = asArray(record.most_reported).flatMap((entry): ReportedTarget[] => {
    const row = asRecord(entry);
    const target = text(row?.target_value);
    if (!target) return [];
    const targetType = text(row?.target_type);
    const reports = nonNegative(row?.report_count);
    const reporters = nonNegative(row?.reporter_count);
    return [
      {
        target_value: target,
        ...(targetType ? { target_type: targetType } : {}),
        ...(reports === undefined ? {} : { report_count: reports }),
        ...(reporters === undefined ? {} : { reporter_count: reporters }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(volume.length > 0 ? { volume } : {}),
    ...(reported.length > 0 ? { most_reported: reported } : {}),
  };
}

export function normalizeProfileModeration(value: unknown): ProfileModerationResponse {
  const record = asRecord(value) ?? {};
  const muted = nonNegative(record.muted_by_count);
  const reports = nonNegative(record.reports_received);
  const consistency = consistencyOf(record);
  const pubkey = hexPubkey(record.pubkey);
  return {
    ...(consistency ? { consistency } : {}),
    ...(pubkey ? { pubkey } : {}),
    ...(muted === undefined ? {} : { muted_by_count: muted }),
    ...(reports === undefined ? {} : { reports_received: reports }),
  };
}

export function normalizeSpamStats(value: unknown): SpamStatsResponse {
  const record = asRecord(value) ?? {};
  const clusters = asArray(record.duplicate_clusters).flatMap((entry): DuplicateCluster[] => {
    const row = asRecord(entry);
    if (!row) return [];
    const fingerprint = text(row.fingerprint);
    const eventId = text(row.first_event_id);
    const pubkey = hexPubkey(row.first_pubkey);
    const events = nonNegative(row.event_count);
    const authors = nonNegative(row.pubkey_count);
    if (!fingerprint && !eventId && !pubkey) return [];
    return [
      {
        ...(fingerprint ? { fingerprint } : {}),
        ...(eventId ? { first_event_id: eventId } : {}),
        ...(pubkey ? { first_pubkey: pubkey } : {}),
        ...(events === undefined ? {} : { event_count: events }),
        ...(authors === undefined ? {} : { pubkey_count: authors }),
      },
    ];
  });
  const authors = asArray(record.burst_authors).flatMap((entry): BurstAuthor[] => {
    const row = asRecord(entry);
    const pubkey = hexPubkey(row?.pubkey);
    if (!pubkey) return [];
    const day = dayString(row?.day);
    const hour = nonNegative(row?.hour);
    const posts = nonNegative(row?.post_count);
    return [
      {
        pubkey,
        ...(day ? { day } : {}),
        ...(hour === undefined ? {} : { hour }),
        ...(posts === undefined ? {} : { post_count: posts }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(clusters.length > 0 ? { duplicate_clusters: clusters } : {}),
    ...(authors.length > 0 ? { burst_authors: authors } : {}),
  };
}

export function normalizeRelayListStats(value: unknown): RelayListStatsResponse {
  const record = asRecord(value) ?? {};
  const series = asArray(record.series).flatMap((entry): RelayListDay[] => {
    const row = asRecord(entry);
    const day = dayString(row?.day);
    if (!day) return [];
    const lists = nonNegative(row?.lists);
    const average = nonNegative(row?.avg_relays_x100);
    const p50 = nonNegative(row?.p50_relays);
    return [
      {
        day,
        ...(lists === undefined ? {} : { lists }),
        ...(average === undefined ? {} : { avg_relays_x100: average }),
        ...(p50 === undefined ? {} : { p50_relays: p50 }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(series.length > 0 ? { series } : {}),
  };
}

export function normalizeRelayHealthHistory(value: unknown): RelayHealthHistoryResponse {
  const record = asRecord(value) ?? {};
  const series = asArray(record.series).flatMap((entry): RelayHealthDay[] => {
    const row = asRecord(entry);
    const day = dayString(row?.day);
    if (!day) return [];
    const probes = nonNegative(row?.probes);
    const ok = nonNegative(row?.connect_ok_bps);
    const p50 = nonNegative(row?.connect_p50_ms);
    const p90 = nonNegative(row?.connect_p90_ms);
    const eose = nonNegative(row?.eose_p50_ms);
    return [
      {
        day,
        ...(probes === undefined ? {} : { probes }),
        ...(ok === undefined ? {} : { connect_ok_bps: ok }),
        ...(p50 === undefined ? {} : { connect_p50_ms: p50 }),
        ...(p90 === undefined ? {} : { connect_p90_ms: p90 }),
        ...(eose === undefined ? {} : { eose_p50_ms: eose }),
      },
    ];
  });
  const consistency = consistencyOf(record);
  const host = text(record.relay_host);
  return {
    ...(consistency ? { consistency } : {}),
    ...(host ? { relay_host: host } : {}),
    ...(series.length > 0 ? { series } : {}),
  };
}

export function normalizeRelaySoftwareStats(value: unknown): RelaySoftwareStatsResponse {
  const record = asRecord(value) ?? {};
  const software = asArray(record.software).flatMap((entry): RelaySoftwareCount[] => {
    const row = asRecord(entry);
    const name = text(row?.software);
    if (!name) return [];
    const relays = nonNegative(row?.relays);
    return [{ software: name, ...(relays === undefined ? {} : { relays }) }];
  });
  const auth = nonNegative(record.auth_required_share_bps);
  const payment = nonNegative(record.payment_required_share_bps);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(software.length > 0 ? { software } : {}),
    ...(auth === undefined ? {} : { auth_required_share_bps: auth }),
    ...(payment === undefined ? {} : { payment_required_share_bps: payment }),
  };
}

export function normalizeMediaHostStats(value: unknown): MediaHostStatsResponse {
  const record = asRecord(value) ?? {};
  const observed = asArray(record.observed).flatMap((entry): MediaHostCount[] => {
    const row = asRecord(entry);
    const domain = text(row?.canonical_domain);
    if (!domain) return [];
    const media = nonNegative(row?.media_count);
    const authors = nonNegative(row?.authors);
    return [
      {
        canonical_domain: domain,
        ...(media === undefined ? {} : { media_count: media }),
        ...(authors === undefined ? {} : { authors }),
      },
    ];
  });
  const servers = asArray(record.blossom_servers).flatMap((entry): BlossomServerCount[] => {
    const row = asRecord(entry);
    const server = text(row?.server);
    if (!server) return [];
    const pubkeys = nonNegative(row?.pubkeys);
    return [{ server, ...(pubkeys === undefined ? {} : { pubkeys }) }];
  });
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(observed.length > 0 ? { observed } : {}),
    ...(servers.length > 0 ? { blossom_servers: servers } : {}),
  };
}

function shapeRow(value: unknown): ContentShapeRow | null {
  const record = asRecord(value);
  const kind = nonNegative(record?.kind);
  if (kind === undefined) return null;
  const posts = nonNegative(record?.posts);
  const mentions = nonNegative(record?.mentions ?? record?.mention_total);
  const hashtags = nonNegative(record?.hashtags ?? record?.hashtag_total);
  const length = lengthHistogram(record?.length ?? record?.length_hist);
  return {
    kind,
    ...(posts === undefined ? {} : { posts }),
    ...(mentions === undefined ? {} : { mentions }),
    ...(hashtags === undefined ? {} : { hashtags }),
    ...(length ? { length } : {}),
  };
}

export function normalizeContentShape(value: unknown): ContentShapeStats {
  const root = asRecord(value) ?? {};
  const content = asRecord(root.content) ?? root;
  const rawShape = content.length_and_mentions;
  const rows = asArray(rawShape).flatMap((entry) => {
    const row = shapeRow(entry);
    return row ? [row] : [];
  });
  const buckets: ContentLengthHistogram = {};
  for (const row of rows) addHistogram(buckets, row.length);
  addHistogram(buckets, lengthHistogram(rawShape));
  const mentionFromRows = rows.reduce((sum, row) => sum + (row.mentions ?? 0), 0);
  const mentionField = nonNegative(
    asRecord(rawShape)?.mentions ?? asRecord(rawShape)?.mention_counts ?? content.mention_total
  );
  const engagement = asArray(content.engagement_by_kind).flatMap((entry): KindEngagementRow[] => {
    const row = asRecord(entry);
    const kind = nonNegative(row?.kind);
    if (kind === undefined) return [];
    const posts = nonNegative(row?.posts);
    const reactions = nonNegative(row?.reactions);
    const replies = nonNegative(row?.replies);
    const zaps = nonNegative(row?.zaps);
    return [
      {
        kind,
        ...(posts === undefined ? {} : { posts }),
        ...(reactions === undefined ? {} : { reactions }),
        ...(replies === undefined ? {} : { replies }),
        ...(zaps === undefined ? {} : { zaps }),
      },
    ];
  });
  const mentionTotal =
    mentionField ??
    (rows.some((row) => typeof row.mentions === "number") ? mentionFromRows : undefined);
  return {
    ...(rows.length > 0 ? { rows } : {}),
    ...(Object.keys(buckets).length > 0 ? { length_buckets: buckets } : {}),
    ...(mentionTotal === undefined ? {} : { mention_total: mentionTotal }),
    ...(engagement.length > 0 ? { engagement_by_kind: engagement } : {}),
  };
}

export function normalizeAccountAge(value: unknown): AccountAgeBucket[] {
  return asArray(value).flatMap((entry): AccountAgeBucket[] => {
    const row = asRecord(entry);
    const bucket = nonNegative(row?.bucket);
    if (bucket === undefined || bucket > 5) return [];
    const authors = nonNegative(row?.authors);
    return [{ bucket, ...(authors === undefined ? {} : { authors }) }];
  });
}

export function readTrustedEngagementShare(value: unknown): number | undefined {
  const record = asRecord(value);
  const nested = asRecord(record?.counts);
  const share = finite(record?.trusted_engagement_share ?? nested?.trusted_engagement_share);
  if (share === undefined || share < 0 || share > 1) return undefined;
  return share;
}
