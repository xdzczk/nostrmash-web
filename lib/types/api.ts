export type Consistency = "strong" | "eventual";

export interface ApiErrorBody {
  error?: string;
  message?: string;
  code?: string;
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
  hashtags?: string[];
  relays?: string[];
  total?: number;
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface DiscoveryHomeResponse {
  notes?: EventRecord[];
  profiles?: Profile[];
  hashtags?: Array<{ hashtag?: string; count?: number; [key: string]: unknown }>;
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
  hashtags?: Array<{ hashtag?: string; count?: number; [key: string]: unknown }>;
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
  ancestors?: EventRecord[];
  replies?: EventRecord[];
  events?: EventRecord[];
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface NoteSummaryResponse {
  note?: EventRecord;
  summary?: Record<string, unknown>;
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface ProfileSummaryResponse {
  pubkey?: string;
  note_count?: number;
  follower_count?: number;
  following_count?: number;
  relay_count?: number;
  consistency?: Consistency | string;
  [key: string]: unknown;
}

export interface StatsResponse {
  consistency?: Consistency | string;
  [key: string]: unknown;
}
