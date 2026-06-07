export type Consistency = "strong" | "eventual";
export type TrustMode = "off" | "best_effort" | "required" | string;

export interface NativeApiSemantics {
  consistency?: Consistency | string;
  trust_mode?: TrustMode;
  trust_applied?: boolean;
  result_scope?: string | Record<string, unknown>;
  next_cursor?: string;
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
  recent_post_count?: number;
  recent_reply_count?: number;
  recent_engagement_received?: number;
  recent_new_followers?: number;
  recent_zap_volume_msats?: number;
  recent_active_days?: number;
  recent_activity_at?: number;
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
  [key: string]: unknown;
}

export interface DomainEntry {
  domain?: string;
  count?: number;
  event_count?: number;
  unique_authors?: number;
  [key: string]: unknown;
}

export interface DiscoveryHomeResponse extends NativeApiSemantics {
  notes?: EventRecord[];
  profiles?: Profile[];
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

export interface HotConversationsResponse extends NativeApiSemantics {
  notes?: EventRecord[];
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

export interface ProfileFollowersResponse extends NativeApiSemantics {
  pubkey?: string;
  followers?: Profile[];
  total?: number;
  [key: string]: unknown;
}

export interface ProfileMentionsResponse extends NativeApiSemantics {
  pubkey?: string;
  mentions?: Profile[];
  total?: number;
  [key: string]: unknown;
}

export interface RelatedProfilesResponse extends NativeApiSemantics {
  pubkey?: string;
  related_profiles?: Profile[];
  total?: number;
  [key: string]: unknown;
}

export interface ContactListContextResponse extends NativeApiSemantics {
  pubkey?: string;
  contacts?: Profile[];
  contact_pubkeys?: string[];
  relays?: string[];
  [key: string]: unknown;
}

export interface RelayListEntry {
  relay_url?: string;
  read?: boolean;
  write?: boolean;
  [key: string]: unknown;
}

export interface RelayListContextResponse extends NativeApiSemantics {
  pubkey?: string;
  relays?: RelayListEntry[];
  [key: string]: unknown;
}

export interface RelayHealthResponse extends NativeApiSemantics {
  relays?: Array<{
    relay_url?: string;
    status?: string;
    healthy?: boolean;
    latency_ms?: number;
    uptime?: number | string;
    last_seen_at?: string | number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface ProfileTopicsResponse extends NativeApiSemantics {
  pubkey?: string;
  topics?: HashtagEntry[];
  profiles?: Profile[];
  [key: string]: unknown;
}

export interface AuthorAnalyticsResponse extends NativeApiSemantics {
  pubkey?: string;
  [key: string]: unknown;
}

export interface TrustScoreResponse extends NativeApiSemantics {
  pubkey?: string;
  trust_score?: number | string;
  score?: number | string;
  metadata?: Record<string, unknown>;
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

export interface BatchProfilesApiResponse extends NativeApiSemantics {
  profiles?: unknown[];
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
export type ProfileFollowersApiResponse = NativeApiSemantics & Record<string, unknown>;
export type ProfileMentionsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type RelatedProfilesApiResponse = NativeApiSemantics & Record<string, unknown>;
export type ContactListContextApiResponse = NativeApiSemantics & Record<string, unknown>;
export type RelayListContextApiResponse = NativeApiSemantics & Record<string, unknown>;
export type RelayHealthApiResponse = NativeApiSemantics & Record<string, unknown>;
export type ProfileTopicsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type AuthorAnalyticsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type TrustScoreApiResponse = NativeApiSemantics & Record<string, unknown>;
export type HashtagDetailApiResponse = NativeApiSemantics & Record<string, unknown>;
export type HashtagNotesApiResponse = NativeApiSemantics & Record<string, unknown>;
export type RelatedHashtagsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type TrendingDomainsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type TrendingLongFormApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserLongFormApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserBookmarksApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserHighlightsApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserMuteListApiResponse = NativeApiSemantics & Record<string, unknown>;
export type UserMutedByApiResponse = NativeApiSemantics & Record<string, unknown>;
export type DomainDetailApiResponse = NativeApiSemantics & Record<string, unknown>;
export type DomainNotesApiResponse = NativeApiSemantics & Record<string, unknown>;

export interface PopularRelayEntry {
  normalized_url: string;
  distinct_users: number;
  in_registry: boolean;
  admission_state?: string;
}

export interface PopularRelaysResponse {
  relays: PopularRelayEntry[];
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
}
