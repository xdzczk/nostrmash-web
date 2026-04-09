export type Consistency = "strong" | "eventual";

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
  [key: string]: unknown;
}

export interface SearchResponse {
  notes?: EventRecord[];
  profiles?: Profile[];
  profile_suggestions?: Profile[];
  hashtags?: HashtagEntry[];
  relays?: string[];
  section_totals?: {
    notes?: number;
    profiles?: number;
    profile_suggestions?: number;
    hashtags?: number;
    relays?: number;
  };
  total?: number;
  errors?: string[];
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface HashtagEntry {
  hashtag?: string;
  count?: number;
  event_count?: number;
  unique_authors?: number;
  [key: string]: unknown;
}

export interface DiscoveryHomeResponse {
  notes?: EventRecord[];
  profiles?: Profile[];
  hashtags?: HashtagEntry[];
  stats?: Record<string, unknown>;
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface TrendingNotesResponse {
  notes?: EventRecord[];
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface TrendingProfilesResponse {
  profiles?: Profile[];
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface TrendingHashtagsResponse {
  hashtags?: HashtagEntry[];
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface EventDetailResponse {
  event?: EventRecord;
  provenance?: {
    relays?: Array<{ relay_url?: string; seen_at?: string }>;
    [key: string]: unknown;
  };
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface ThreadResponse {
  root?: EventRecord;
  event?: EventRecord;
  ancestors?: EventRecord[];
  replies?: EventRecord[];
  events?: EventRecord[];
  missing_ancestor_ids?: string[];
  next_cursor?: string;
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface NoteSummaryResponse {
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
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface ProfileSummaryResponse {
  pubkey?: string;
  profile?: Profile;
  stats?: ProfileStats;
  note_count?: number;
  follower_count?: number;
  following_count?: number;
  reply_count?: number;
  recent_activity_at?: number;
  relay_count?: number;
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface StatsResponse {
  consistency?: Consistency | string;
  [key: string]: unknown;
}
