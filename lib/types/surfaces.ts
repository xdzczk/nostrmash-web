import type { NativeApiSemantics } from "@/lib/types/api";

/** Basis points stay integers here. 100 bps is 1 percent. */
export interface ProfileGraphStats {
  mutual_count?: number;
  reciprocity_bps?: number;
  follow_back_rate_bps?: number;
  ghost_follower_bps?: number;
}

export interface EventLabel {
  labeler_pubkey?: string;
  namespace?: string;
  label: string;
  is_self?: boolean;
  target_type?: string;
  target_value?: string;
  event_id?: string;
}

export interface EventLabelsResponse extends NativeApiSemantics {
  event_id?: string;
  labels?: EventLabel[];
}

export interface LabelCount {
  namespace: string;
  label: string;
  count?: number;
}

export interface LanguageAgreement {
  agree?: number;
  disagree?: number;
}

export interface LabelStatsResponse extends NativeApiSemantics {
  labels?: LabelCount[];
  language_agreement?: LanguageAgreement;
}

export interface EmojiCount {
  shortcode: string;
  count?: number;
}

export interface EmojiStatsResponse extends NativeApiSemantics {
  window?: string;
  emoji?: EmojiCount[];
}

export interface GroupSummary {
  relay_url: string;
  group_id: string;
  name?: string;
  about?: string;
  is_public?: boolean;
  is_open?: boolean;
  admin_count?: number;
  member_count?: number;
  messages_7d?: number;
}

export interface GroupDetail extends NativeApiSemantics {
  relay_url?: string;
  group_id?: string;
  name?: string;
  about?: string;
  is_public?: boolean;
  is_open?: boolean;
  admin_count?: number;
  member_count?: number;
}

export interface GroupsResponse extends NativeApiSemantics {
  groups?: GroupSummary[];
}

export interface GroupMessage {
  event_id: string;
  author?: string;
  created_at?: number;
  kind?: number;
}

export interface GroupMessagesResponse extends NativeApiSemantics {
  messages?: GroupMessage[];
}

export interface GroupSizeBucket {
  members: string;
  groups?: number;
}

export interface GroupActivityDay {
  day: string;
  messages?: number;
  active_groups?: number;
}

export interface GroupStatsResponse extends NativeApiSemantics {
  groups?: number;
  active_groups_1d?: number;
  active_groups_7d?: number;
  messages_1d?: number;
  series?: GroupActivityDay[];
  size_histogram?: GroupSizeBucket[];
}

export interface LiveChatResponse extends NativeApiSemantics {
  address?: string;
  chat_count?: number;
  unique_chatters?: number;
  last_chat_at?: number;
}

export interface PollOption {
  id: string;
  label: string;
}

export interface PollCount {
  option_id: string;
  votes?: number;
}

export interface EventPollResponse extends NativeApiSemantics {
  event_id?: string;
  author?: string;
  question?: string;
  poll_type?: string;
  options?: PollOption[];
  counts?: PollCount[];
}

export interface PollSummary {
  event_id: string;
  author?: string;
  question?: string;
  poll_type?: string;
  votes?: number;
}

export interface PollsResponse extends NativeApiSemantics {
  polls?: PollSummary[];
}

export interface PollStatsResponse extends NativeApiSemantics {
  polls?: number;
  votes?: number;
}

export interface BadgeAward {
  address: string;
  awarded_at?: number;
}

export interface ProfileBadgesResponse extends NativeApiSemantics {
  pubkey?: string;
  awards?: BadgeAward[];
  /** Accepted badge addresses from the profile's kind-30008 list. */
  accepted?: string[];
}

export interface BadgeResponse extends NativeApiSemantics {
  address?: string;
  issuer?: string;
  name?: string;
  description?: string;
  image?: string;
  awards?: number;
}

export interface BadgeStatsResponse extends NativeApiSemantics {
  definitions?: number;
  awards?: number;
}

export interface ZapGoal {
  event_id: string;
  author?: string;
  amount_msats?: number;
  raised_sats?: number;
  summary?: string;
}

export interface EventGoalResponse extends NativeApiSemantics {
  event_id?: string;
  author?: string;
  amount_msats?: number;
  raised_sats?: number;
  summary?: string;
}

export interface GoalsResponse extends NativeApiSemantics {
  goals?: ZapGoal[];
}

export interface UserStatus {
  d_tag?: string;
  content?: string;
  link?: string;
  expires_at?: number;
}

export interface ProfileStatusResponse extends NativeApiSemantics {
  pubkey?: string;
  statuses?: UserStatus[];
}

export interface CurationSetSummary {
  address: string;
  author?: string;
  kind?: number;
  title?: string;
  item_count?: number;
}

export interface CurationSetItem {
  type: string;
  value: string;
}

export interface CurationSetDetail extends NativeApiSemantics {
  address?: string;
  author?: string;
  kind?: number;
  title?: string;
  description?: string;
  item_count?: number;
  items?: CurationSetItem[];
}

export interface CurationSetsResponse extends NativeApiSemantics {
  curation_sets?: CurationSetSummary[];
}

export interface InterestList {
  kind?: number;
  hashtags?: string[];
}

export interface ProfileInterestsResponse extends NativeApiSemantics {
  pubkey?: string;
  interests?: InterestList[];
}

export interface RelayPreferenceList {
  kind?: number;
  relays?: string[];
}

export interface ProfileListsResponse extends NativeApiSemantics {
  pubkey?: string;
  lists?: RelayPreferenceList[];
}

export interface ProfileLabelsResponse extends NativeApiSemantics {
  pubkey?: string;
  labels?: EventLabel[];
}

export interface ExternalIdentity {
  platform: string;
  identity?: string;
  proof?: string;
}

export interface ExternalIdentitiesResponse extends NativeApiSemantics {
  pubkey?: string;
  identities?: ExternalIdentity[];
}

export interface KindActivity {
  kind: number;
  event_count?: number;
  unique_authors?: number;
}

export interface KindFamilyStats {
  family: string;
  event_count?: number;
  kinds?: KindActivity[];
}

export interface KindStatsResponse extends NativeApiSemantics {
  window?: string;
  families?: KindFamilyStats[];
}

export interface ConversationDay {
  day: string;
  threads?: number;
  p50_first_reply_s?: number;
  /** Average depth times 100. */
  avg_depth_x100?: number;
  /** Average branching times 100. */
  avg_branching_x100?: number;
}

export interface ConversationStatsResponse extends NativeApiSemantics {
  series?: ConversationDay[];
}

export interface ZapLeaderboardItem {
  pubkey: string;
  sats?: number;
  zap_count?: number;
}

export interface ZapLeaderboardResponse extends NativeApiSemantics {
  role?: string;
  window?: string;
  items?: ZapLeaderboardItem[];
}

export interface ZapHeatmapCell {
  day_of_week: number;
  hour: number;
  zap_count?: number;
  sats?: number;
}

export interface ZapHeatmapResponse extends NativeApiSemantics {
  cells?: ZapHeatmapCell[];
}

export type HashtagMomentumStatus = "emerging" | "fading" | "steady";

export interface HashtagMomentum {
  hashtag: string;
  z_score_7d?: number;
  status?: HashtagMomentumStatus;
}

export interface EmergingHashtagsResponse extends NativeApiSemantics {
  items?: HashtagMomentum[];
}

export interface HashtagHistoryDay {
  day: string;
  events?: number;
  authors?: number;
}

export interface HashtagHistoryResponse extends NativeApiSemantics {
  hashtag?: string;
  series?: HashtagHistoryDay[];
}

export interface DeletionDay {
  day: string;
  kind?: number;
  count?: number;
  p50_time_to_delete_s?: number;
}

export interface DeletionStatsResponse extends NativeApiSemantics {
  items?: DeletionDay[];
}

export interface ReportDay {
  day: string;
  report_type?: string;
  count?: number;
}

export interface ReportedTarget {
  target_type?: string;
  target_value: string;
  report_count?: number;
  reporter_count?: number;
}

export interface ModerationStatsResponse extends NativeApiSemantics {
  volume?: ReportDay[];
  most_reported?: ReportedTarget[];
}

export interface ProfileModerationResponse extends NativeApiSemantics {
  pubkey?: string;
  muted_by_count?: number;
  reports_received?: number;
}

export interface DuplicateCluster {
  fingerprint?: string;
  first_event_id?: string;
  first_pubkey?: string;
  event_count?: number;
  pubkey_count?: number;
}

export interface BurstAuthor {
  pubkey: string;
  day?: string;
  hour?: number;
  post_count?: number;
}

export interface SpamStatsResponse extends NativeApiSemantics {
  duplicate_clusters?: DuplicateCluster[];
  burst_authors?: BurstAuthor[];
}

export interface RelayListDay {
  day: string;
  lists?: number;
  /** Average relay count times 100. */
  avg_relays_x100?: number;
  p50_relays?: number;
}

export interface RelayListStatsResponse extends NativeApiSemantics {
  series?: RelayListDay[];
}

export interface RelayHealthDay {
  day: string;
  probes?: number;
  connect_ok_bps?: number;
  connect_p50_ms?: number;
  connect_p90_ms?: number;
  eose_p50_ms?: number;
}

export interface RelayHealthHistoryResponse extends NativeApiSemantics {
  relay_host?: string;
  series?: RelayHealthDay[];
}

export interface RelaySoftwareCount {
  software: string;
  relays?: number;
}

export interface RelaySoftwareStatsResponse extends NativeApiSemantics {
  software?: RelaySoftwareCount[];
  auth_required_share_bps?: number;
  payment_required_share_bps?: number;
}

export interface MediaHostCount {
  canonical_domain: string;
  media_count?: number;
  authors?: number;
}

export interface BlossomServerCount {
  server: string;
  pubkeys?: number;
}

export interface MediaHostStatsResponse extends NativeApiSemantics {
  observed?: MediaHostCount[];
  blossom_servers?: BlossomServerCount[];
}

export const CONTENT_LENGTH_BUCKETS = ["0_80", "80_280", "280_1000", "1000_plus"] as const;

export type ContentLengthBucket = (typeof CONTENT_LENGTH_BUCKETS)[number];

export type ContentLengthHistogram = Partial<Record<ContentLengthBucket, number>>;

export interface ContentShapeRow {
  kind: number;
  posts?: number;
  mentions?: number;
  hashtags?: number;
  length?: ContentLengthHistogram;
}

export interface KindEngagementRow {
  kind: number;
  posts?: number;
  reactions?: number;
  replies?: number;
  zaps?: number;
}

export interface ContentShapeStats {
  rows?: ContentShapeRow[];
  length_buckets?: ContentLengthHistogram;
  mention_total?: number;
  engagement_by_kind?: KindEngagementRow[];
}

export interface AccountAgeBucket {
  bucket: number;
  authors?: number;
}

export type GroupSort = "active" | "members" | "recent";
export type PollSort = "recent" | "votes";
export type ZapLeaderboardRole = "sender" | "receiver";
