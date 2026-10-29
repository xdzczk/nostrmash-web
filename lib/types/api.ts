import type { GeneratedBatchEventsResponse } from "@/lib/types/generated";

export type Consistency = "strong" | "eventual";
export type TrustMode = "off" | "best_effort" | "required" | string;
export type DiscoveryConfidence = "low" | "medium" | "high";

export interface DiscoveryReasonEvidence {
  metric: string;
  value: number;
  unit?: string;
}

export interface DiscoveryRankingReason {
  code: string;
  evidence?: DiscoveryReasonEvidence[];
}

export interface DiscoveryItemRanking {
  rank: number;
  score: number;
  previous_rank?: number;
  rank_delta?: number;
  reasons?: DiscoveryRankingReason[];
  source_breadth?: number;
  confidence?: DiscoveryConfidence;
}

export interface DiscoveryListMeta {
  window?: "24h" | "7d" | "30d" | string;
  computed_at?: string;
  ranking_version?: string;
  confidence?: DiscoveryConfidence;
}

export interface LanguageCount {
  language: string;
  count: number;
}

/** Global note counts by language. Present on every discovery response. */
export interface TopLanguages {
  "24h"?: LanguageCount[];
  "7d"?: LanguageCount[];
  "30d"?: LanguageCount[];
}

export interface NativeApiSemantics {
  consistency?: Consistency | string;
  trust_mode?: TrustMode;
  trust_applied?: boolean;
  result_scope?: string | Record<string, unknown>;
  /** Upstream served a fallback dataset instead of the requested one. */
  degraded?: boolean;
  degraded_reason?: string;
  next_cursor?: string;
  window?: string;
  /** Echoed when the request included `lang`. */
  language?: string;
  /** Selector source. On discovery/home this is also under sections.network_summary. */
  top_languages?: TopLanguages;
  computed_at?: string;
  ranking_version?: string;
  meta?: DiscoveryListMeta;
}

export interface ApiErrorDetails {
  code?: string;
  message?: string;
  request_id?: string;
  [key: string]: unknown;
}

export interface ApiErrorBody {
  error?: string | ApiErrorDetails;
  message?: string | ApiErrorDetails;
  code?: string;
  request_id?: string;
  [key: string]: unknown;
}

export interface Profile {
  pubkey: string;
  npub?: string;
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
  banner?: string;
  bot?: boolean;
  /** Custom profile fields (label, value) pairs from kind-0 metadata. */
  fields?: ProfileField[];
  recent_post_count?: number;
  recent_reply_count?: number;
  recent_engagement_received?: number;
  recent_new_followers?: number;
  recent_zap_volume_msats?: number;
  recent_active_days?: number;
  recent_activity_at?: number;
  follower_count?: number;
  ranking?: DiscoveryItemRanking;
  /** Related-profile signals (only present on `/related` results). */
  reasons?: string[];
  interaction_adjacency?: number;
  reply_adjacency?: number;
  quote_repost_adjacency?: number;
  topic_overlap?: number;
  score?: number;
  [key: string]: unknown;
}

export type ProfileField = [label: string, value: string];

export interface TrustSummary {
  tier?: string;
  hop_distance?: number;
  /** 0..1 fraction; lower means more trusted (0.001 = top 0.1%). */
  percentile?: number;
  [key: string]: unknown;
}

export interface ProfileStats {
  follower_count?: number;
  following_count?: number;
  note_count?: number;
  reply_count?: number;
  recent_activity_at?: number;
  relay_count?: number;
  [key: string]: unknown;
}

export interface EventRecord {
  id: string;
  pubkey?: string;
  kind?: number;
  created_at?: number;
  content?: string;
  tags?: string[][];
  ranking?: DiscoveryItemRanking;
  preview?: {
    mode?: string;
    display_content?: string;
    first_line?: string;
    is_compact?: boolean;
    contains_raw?: boolean;
    domains?: string[];
    open_note_url?: string;
    contains_content?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const LONG_FORM_KIND = 30023;

export interface ArticleRecord extends EventRecord {
  title?: string;
  summary?: string;
  image?: string;
  language?: string;
  published_at?: number;
  score?: number;
  author?: Profile;
}

export interface SearchResponse extends NativeApiSemantics {
  notes?: EventRecord[];
  profiles?: Profile[];
  profile_suggestions?: Profile[];
  hashtags?: HashtagEntry[];
  relays?: string[];
  surface_errors?: Partial<Record<"search" | "notes" | "profiles" | "suggest", string>>;
  surface_cursors?: Partial<Record<"search" | "notes" | "profiles" | "suggest", string>>;
  surface_offsets?: Partial<Record<"notes" | "profiles", number>>;
  section_totals?: {
    notes?: number;
    profiles?: number;
    profile_suggestions?: number;
    hashtags?: number;
    relays?: number;
  };
  offset?: number;
  next_offset?: number;
  total?: number;
  /** `api` when total or section totals came from the index; `page` when they are slice lengths. */
  totals_source?: "api" | "page";
  /** Set when the index searched a spelling correction instead of the raw query. */
  corrected_query?: string;
  /** Direct note lookup for an identifier query, separate from ranked hits. */
  direct_note?: EventRecord;
  /** Direct profile lookup for an identifier query, separate from ranked hits. */
  direct_profile?: Profile;
  errors?: string[];
  [key: string]: unknown;
}

export interface SearchApiResponse extends NativeApiSemantics {
  events?: unknown[];
  notes?: unknown[];
  profiles?: unknown[];
  profile_suggestions?: unknown[];
  hashtags?: HashtagEntry[];
  relays?: unknown[];
  total?: number;
  section_totals?: SearchResponse["section_totals"];
  [key: string]: unknown;
}

export interface HashtagEntry {
  hashtag?: string;
  count?: number;
  event_count?: number;
  unique_authors?: number;
  ranking?: DiscoveryItemRanking;
  [key: string]: unknown;
}

export interface DomainTrendWindow {
  link_count?: number;
  note_count?: number;
  unique_authors?: number;
}

export interface DomainEntry {
  domain?: string;
  count?: number;
  event_count?: number;
  /** Links to this domain in the window (discovery/home + domains/trending). */
  link_count?: number;
  /** Distinct notes linking to this domain in the window. */
  note_count?: number;
  unique_authors?: number;
  /** Per-range counts. `30d` is optional until every payload includes it. */
  trend_windows?: {
    "24h"?: DomainTrendWindow;
    "7d"?: DomainTrendWindow;
    "30d"?: DomainTrendWindow;
  };
  ranking?: DiscoveryItemRanking;
  [key: string]: unknown;
}

export interface DiscoveryHomeResponse extends NativeApiSemantics {
  notes?: EventRecord[];
  profiles?: Profile[];
  /** Small/fast-growing profiles from sections.profiles.rising ("Up and coming"). */
  rising_profiles?: Profile[];
  hashtags?: HashtagEntry[];
  domains?: DomainEntry[];
  stats?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TrendingNotesResponse extends NativeApiSemantics {
  notes?: EventRecord[];
  [key: string]: unknown;
}

export interface TrendingProfilesResponse extends NativeApiSemantics {
  profiles?: Profile[];
  [key: string]: unknown;
}

export interface TrendingMediaResponse extends NativeApiSemantics {
  surface?: string;
  format?: string;
  window?: string;
  events?: EventRecord[];
  offset?: number;
  next_offset?: number;
  total?: number;
  [key: string]: unknown;
}

export interface TrendingLongFormResponse extends NativeApiSemantics {
  surface?: string;
  window?: string;
  articles?: ArticleRecord[];
  offset?: number;
  next_offset?: number;
  total?: number;
  [key: string]: unknown;
}

export interface UserLongFormResponse extends NativeApiSemantics {
  pubkey?: string;
  articles?: ArticleRecord[];
  total?: number;
  [key: string]: unknown;
}

export interface UserBookmarksResponse extends NativeApiSemantics {
  pubkey?: string;
  events?: EventRecord[];
  total?: number;
  [key: string]: unknown;
}

export interface UserHighlightsResponse extends NativeApiSemantics {
  pubkey?: string;
  highlights?: EventRecord[];
  total?: number;
  [key: string]: unknown;
}

export interface UserMediaResponse extends NativeApiSemantics {
  pubkey?: string;
  events?: EventRecord[];
  total?: number;
  [key: string]: unknown;
}

export interface UserLiveActivitiesResponse extends NativeApiSemantics {
  pubkey?: string;
  events?: EventRecord[];
  total?: number;
  [key: string]: unknown;
}

export interface PinItem {
  tag: "e" | "a";
  value: string;
}

export interface UserPinsResponse extends NativeApiSemantics {
  pubkey?: string;
  items?: PinItem[];
  [key: string]: unknown;
}

export interface LiveActivitiesResponse extends NativeApiSemantics {
  events?: EventRecord[];
  [key: string]: unknown;
}

export interface EventCommentsResponse extends NativeApiSemantics {
  event_id?: string;
  comments?: EventRecord[];
  [key: string]: unknown;
}

export interface ReportTarget {
  id?: string;
  reporter_pubkey?: string;
  report_type?: string;
  content?: string;
  created_at?: number;
  target_event_id?: string;
  target_pubkey?: string;
}

export interface ReportsResponse extends NativeApiSemantics {
  reports?: ReportTarget[];
  event_id?: string;
  pubkey?: string;
  [key: string]: unknown;
}

export interface UserMuteListResponse extends NativeApiSemantics {
  pubkey?: string;
  profiles?: Profile[];
  total?: number;
  [key: string]: unknown;
}

export interface UserMutedByResponse extends NativeApiSemantics {
  pubkey?: string;
  profiles?: Profile[];
  total?: number;
  [key: string]: unknown;
}

export interface TrendingHashtagsResponse extends NativeApiSemantics {
  hashtags?: HashtagEntry[];
  [key: string]: unknown;
}

export interface TrendingDomainsResponse extends NativeApiSemantics {
  domains?: DomainEntry[];
  [key: string]: unknown;
}

export interface ConversationHotspot extends EventRecord {
  root_event_id?: string;
  participant_count?: number;
  last_activity_at?: number;
  replies_24h?: number;
  replies_7d?: number;
  replies_30d?: number;
  velocity_score?: number;
  reply_count?: number;
  repost_count?: number;
  reaction_count?: number;
  zap_count?: number;
  zap_msats?: number;
  activity?: {
    replies_24h?: number;
    replies_7d?: number;
    replies_30d?: number;
    [key: string]: unknown;
  };
}

export interface HotConversationsResponse extends NativeApiSemantics {
  notes?: ConversationHotspot[];
  conversations?: ConversationHotspot[];
  [key: string]: unknown;
}

export interface RisingProfilesResponse extends NativeApiSemantics {
  profiles?: Profile[];
  [key: string]: unknown;
}

export interface HashtagDetailResponse extends NativeApiSemantics {
  hashtag?: string;
  count?: number;
  event_count?: number;
  unique_authors?: number;
  related?: HashtagEntry[];
  notes?: EventRecord[];
  total?: number;
  [key: string]: unknown;
}

export interface HashtagNotesResponse extends NativeApiSemantics {
  hashtag?: string;
  notes?: EventRecord[];
  total?: number;
  next_cursor?: string;
  [key: string]: unknown;
}

export interface RelatedHashtagsResponse extends NativeApiSemantics {
  hashtag?: string;
  related?: HashtagEntry[];
  hashtags?: HashtagEntry[];
  total?: number;
  [key: string]: unknown;
}

export interface DomainDetailResponse extends NativeApiSemantics {
  domain?: string;
  count?: number;
  event_count?: number;
  unique_authors?: number;
  notes?: EventRecord[];
  total?: number;
  [key: string]: unknown;
}

export interface DomainNotesResponse extends NativeApiSemantics {
  domain?: string;
  notes?: EventRecord[];
  total?: number;
  [key: string]: unknown;
}

export interface EventDetailResponse extends NativeApiSemantics {
  event?: EventRecord;
  provenance?: {
    relays?: Array<{ relay_url?: string; seen_at?: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface EventSeenOnResponse extends NativeApiSemantics {
  relays?: Array<{
    relay_url?: string;
    seen_at?: string | number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface EventCountsResponse extends NativeApiSemantics {
  counts?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ThreadResponse extends NativeApiSemantics {
  root?: EventRecord;
  event?: EventRecord;
  ancestors?: EventRecord[];
  replies?: EventRecord[];
  events?: EventRecord[];
  missing_ancestor_ids?: string[];
  [key: string]: unknown;
}

export interface EventAncestorsResponse extends NativeApiSemantics {
  event?: EventRecord;
  ancestors?: EventRecord[];
  missing_ancestor_ids?: string[];
  [key: string]: unknown;
}

export interface EventRepliesResponse extends NativeApiSemantics {
  event?: EventRecord;
  root_event_id?: string;
  replies?: EventRecord[];
  [key: string]: unknown;
}

export interface ThreadSummaryResponse extends NativeApiSemantics {
  root_event_id?: string;
  summary?: Record<string, unknown>;
  counts?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ThreadActivityResponse extends NativeApiSemantics {
  root_event_id?: string;
  activity?: EventRecord[];
  [key: string]: unknown;
}

export interface RelatedNotesResponse extends NativeApiSemantics {
  event_id?: string;
  related?: EventRecord[];
  [key: string]: unknown;
}

export interface NoteSummaryResponse extends NativeApiSemantics {
  note?: EventRecord;
  event?: EventRecord;
  author?: {
    pubkey?: string;
    profile?: Profile;
    stats?: ProfileStats;
    [key: string]: unknown;
  };
  counts?: Record<string, unknown>;
  media?: Record<string, unknown>;
  thread?: Record<string, unknown>;
  quote_repost_context?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProfileSummaryResponse extends NativeApiSemantics {
  pubkey?: string;
  profile?: Profile;
  stats?: ProfileStats;
  trust_summary?: TrustSummary;
  metadata_event_id?: string;
  metadata_created_at?: number;
  recent_note_previews?: EventRecord[];
  note_count?: number;
  follower_count?: number;
  following_count?: number;
  reply_count?: number;
  recent_activity_at?: number;
  relay_count?: number;
  [key: string]: unknown;
}

export interface AuthorEventsResponse extends NativeApiSemantics {
  pubkey?: string;
  events?: EventRecord[];
  [key: string]: unknown;
}

export interface AuthorRepliesResponse extends NativeApiSemantics {
  pubkey?: string;
  replies?: EventRecord[];
  [key: string]: unknown;
}

export interface AuthorReactionRecord {
  event_id?: string;
  target_event_id?: string;
  reaction?: string;
  reaction_type?: string;
  created_at?: number;
  event?: EventRecord;
  target_event?: EventRecord;
  target_note?: EventRecord;
  [key: string]: unknown;
}

export interface AuthorReactionsResponse extends NativeApiSemantics {
  pubkey?: string;
  reactions?: AuthorReactionRecord[];
  [key: string]: unknown;
}

export interface AuthorZapRecord {
  event_id?: string;
  target_event_id?: string;
  sender_pubkey?: string;
  receiver_pubkey?: string;
  sats?: number;
  msats?: number;
  amount_msats?: number;
  zap_text?: string;
  created_at?: number;
  event?: EventRecord;
  target_event?: EventRecord;
  target_note?: EventRecord;
  [key: string]: unknown;
}

export interface AuthorZapsResponse extends NativeApiSemantics {
  pubkey?: string;
  zaps?: AuthorZapRecord[];
  [key: string]: unknown;
}

export interface RelatedProfilesResponse extends NativeApiSemantics {
  pubkey?: string;
  related_profiles?: Profile[];
  total?: number;
  [key: string]: unknown;
}

export interface RelayHealthResponse extends NativeApiSemantics {
  /** Checkpoint rows in this response, not a count of distinct hosts. */
  total?: number;
  scope?: string;
  relays?: Array<{
    relay_url?: string;
    status?: string;
    healthy?: boolean;
    mode?: string;
    filter_group?: string;
    last_error?: string;
    latest_checkpoint_at?: string | number;
    eose_seen_at?: string | number;
    last_seen_at?: string | number;
    /** True when the checkpoint is older than 24 hours. */
    stale?: boolean;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface StatsResponse extends NativeApiSemantics {
  [key: string]: unknown;
}

export interface SearchNotesApiResponse extends NativeApiSemantics {
  notes?: unknown[];
  limit?: number;
  offset?: number;
  total?: number;
  section_totals?: SearchResponse["section_totals"];
  [key: string]: unknown;
}

export interface SearchProfilesApiResponse extends NativeApiSemantics {
  profiles?: unknown[];
  limit?: number;
  offset?: number;
  total?: number;
  section_totals?: SearchResponse["section_totals"];
  [key: string]: unknown;
}

export interface SearchSuggestApiResponse extends NativeApiSemantics {
  profiles?: unknown[];
  hashtags?: HashtagEntry[];
  relays?: unknown[];
  suggested_profiles?: unknown[];
  suggested_hashtags?: HashtagEntry[];
  total?: number;
  section_totals?: SearchResponse["section_totals"];
  [key: string]: unknown;
}

/** OpenAPI-backed shapes with a normalize-boundary index signature. */
export type BatchEventsApiResponse = GeneratedBatchEventsResponse &
  NativeApiSemantics & {
    events?: EventRecord[] | unknown[];
    missing?: string[];
    [key: string]: unknown;
  };

export interface BatchProfilesApiResponse extends NativeApiSemantics {
  profiles?: unknown[];
  missing_pubkeys?: string[];
  [key: string]: unknown;
}

export type ProfileApiResponse = NativeApiSemantics & Record<string, unknown>;
export type ProfileSummaryApiResponse = NativeApiSemantics & Record<string, unknown>;
export type ThreadApiResponse = NativeApiSemantics & Record<string, unknown>;
export type NoteSummaryApiResponse = NativeApiSemantics & Record<string, unknown>;
export type EventSeenOnApiResponse = NativeApiSemantics & Record<string, unknown>;
export type EventCountsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type EventAncestorsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type EventRepliesApiResponse = NativeApiSemantics & Record<string, unknown>;
export type ThreadSummaryApiResponse = NativeApiSemantics & Record<string, unknown>;
export type ThreadActivityApiResponse = NativeApiSemantics & Record<string, unknown>;
export type RelatedNotesApiResponse = NativeApiSemantics & Record<string, unknown>;
export type AuthorEventsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type AuthorRepliesApiResponse = NativeApiSemantics & Record<string, unknown>;
export type AuthorReactionsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type AuthorZapsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type RelatedProfilesApiResponse = NativeApiSemantics & Record<string, unknown>;
export type RelayHealthApiResponse = NativeApiSemantics & Record<string, unknown>;
export type HashtagDetailApiResponse = NativeApiSemantics & Record<string, unknown>;
export type HashtagNotesApiResponse = NativeApiSemantics & Record<string, unknown>;
export type RelatedHashtagsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type TrendingDomainsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type TrendingLongFormApiResponse = NativeApiSemantics & Record<string, unknown>;
export type TrendingMediaApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserLongFormApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserBookmarksApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserHighlightsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserMediaApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserLiveActivitiesApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserPinsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type LiveActivitiesApiResponse = NativeApiSemantics & Record<string, unknown>;
export type EventCommentsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type ReportsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserMuteListApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserMutedByApiResponse = NativeApiSemantics & Record<string, unknown>;
export type DomainDetailApiResponse = NativeApiSemantics & Record<string, unknown>;
export type DomainNotesApiResponse = NativeApiSemantics & Record<string, unknown>;

export interface PopularRelayEntry {
  normalized_url: string;
  distinct_users: number;
  in_registry: boolean;
  admission_state?: string;
  /** Present when the relay published a name in its stored NIP-11 document. */
  name?: string;
  /** Present when the relay published an icon URL. */
  icon?: string;
  /**
   * Present only when the relay stated `limitation.auth_required`.
   * `false` means the relay said no. A missing field means it said nothing.
   */
  auth_required?: boolean;
  /** Present only when the relay stated `limitation.payment_required`. */
  payment_required?: boolean;
}

export interface PopularRelaysResponse {
  relays: PopularRelayEntry[];
  /** Full ranked population. `relays` is the page after `limit`. */
  total?: number;
  limit?: number;
}

export interface RelayProbeHealthEntry {
  normalized_url: string;
  admission_state: string;
  last_probe_at?: string;
  last_probe_status?: string;
  probe_fail_rate: number;
  avg_connect_latency_ms?: number;
  avg_eose_latency_ms?: number;
  last_connect_ok?: boolean;
  last_subscribe_ok?: boolean;
  last_eose_ok?: boolean;
}

export interface RelayProbeHealthResponse {
  relays: RelayProbeHealthEntry[];
  /** Registry relays that have been probed. `relays` is the page after `limit`. */
  total?: number;
  limit?: number;
}

export interface Nip11Fee {
  amount: number;
  unit: string;
  period?: number;
  kinds?: number[];
}

export interface Nip11Fees {
  admission?: Nip11Fee[];
  subscription?: Nip11Fee[];
  publication?: Nip11Fee[];
}

/** A kind number, or an inclusive two-element range. */
export type Nip11Kind = number | [number, number];

export interface Nip11RetentionRule {
  kinds?: Nip11Kind[];
  time?: number;
  count?: number;
}

export interface Nip11Limitation {
  auth_required?: boolean;
  payment_required?: boolean;
  restricted_writes?: boolean;
  max_message_length?: number;
  max_subscriptions?: number;
  max_filters?: number;
  max_limit?: number;
  max_subid_length?: number;
  max_event_tags?: number;
  max_content_length?: number;
  min_pow_difficulty?: number;
  created_at_lower_limit?: number;
  created_at_upper_limit?: number;
}

/** Fields the relay published. Every property is optional. */
export interface Nip11Info {
  name?: string;
  description?: string;
  icon?: string;
  banner?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitation?: Nip11Limitation;
  fees?: Nip11Fees;
  retention?: Nip11RetentionRule[];
}

export interface Nip11Document {
  fetched_at: string;
  ok: boolean;
  /** Set when `ok` is false. One of the fetcher codes, including `http_<status>`. */
  error?: string;
  info?: Nip11Info;
}

export interface RelayInfoProbe {
  last_probe_at?: string | null;
  last_probe_status?: string;
  probe_fail_rate?: number;
  avg_connect_latency_ms?: number | null;
  avg_eose_latency_ms?: number | null;
  last_connect_ok?: boolean | null;
  last_subscribe_ok?: boolean | null;
  last_eose_ok?: boolean | null;
}

export interface RelayInfoActivity {
  event_count_24h?: number;
  event_count_7d?: number;
}

export interface RelayInfoResponse {
  relay_url: string;
  distinct_users: number;
  score: number;
  probe: RelayInfoProbe;
  activity: RelayInfoActivity;
  /** Null until a background fetch has completed. */
  nip11: Nip11Document | null;
}
