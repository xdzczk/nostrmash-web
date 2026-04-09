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

export interface SearchResponse extends NativeApiSemantics {
  notes?: EventRecord[];
  profiles?: Profile[];
  profile_suggestions?: Profile[];
  hashtags?: HashtagEntry[];
  relays?: string[];
  surface_errors?: Partial<Record<"search" | "notes" | "profiles" | "suggest", string>>;
  surface_cursors?: Partial<Record<"search" | "notes" | "profiles" | "suggest", string>>;
  section_totals?: {
    notes?: number;
    profiles?: number;
    profile_suggestions?: number;
    hashtags?: number;
    relays?: number;
  };
  total?: number;
  errors?: string[];
  [key: string]: unknown;
}

export interface SearchApiResponse extends NativeApiSemantics {
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

export interface DiscoveryHomeResponse extends NativeApiSemantics {
  notes?: EventRecord[];
  profiles?: Profile[];
  hashtags?: HashtagEntry[];
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

export interface TrendingHashtagsResponse extends NativeApiSemantics {
  hashtags?: HashtagEntry[];
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
  note_count?: number;
  follower_count?: number;
  following_count?: number;
  reply_count?: number;
  recent_activity_at?: number;
  relay_count?: number;
  [key: string]: unknown;
}

export interface StatsResponse extends NativeApiSemantics {
  [key: string]: unknown;
}

export interface SearchNotesApiResponse extends NativeApiSemantics {
  notes?: unknown[];
  total?: number;
  section_totals?: SearchResponse["section_totals"];
  [key: string]: unknown;
}

export interface SearchProfilesApiResponse extends NativeApiSemantics {
  profiles?: unknown[];
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
