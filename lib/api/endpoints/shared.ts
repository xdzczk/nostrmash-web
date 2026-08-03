import type { SearchResponse } from "@/lib/types/api";
import { ApiError, isApiTimeoutError } from "@/lib/api/http";
import { normalizeEventRecord, normalizeEventRecords } from "@/lib/api/normalize";
import { npubToHex } from "@/lib/nostr/npub";

export interface SearchQuery {
  q: string;
  tab?: "all" | "notes" | "profiles";
  limit?: number;
  offset?: number;
  /** Opt-in search bundle extras, e.g. "suggest". */
  include?: string;
}

export const nativeApiV1Routes = {
  discoveryHome: "/api/v1/discovery/home",
  search: "/api/v1/search",
  searchNotes: "/api/v1/search/notes",
  searchProfiles: "/api/v1/search/profiles",
  searchSuggest: "/api/v1/search/suggest",
  profilesBatch: "/api/v1/profiles/batch",
  profileByPubkey: (pubkey: string) => `/api/v1/profiles/${encodeURIComponent(pubkey)}`,
  profileSummaryByPubkey: (pubkey: string) => `/api/v1/users/${encodeURIComponent(pubkey)}/summary`,
  userLongFormByPubkey: (pubkey: string) => `/api/v1/users/${encodeURIComponent(pubkey)}/long-form`,
  userBookmarksByPubkey: (pubkey: string) =>
    `/api/v1/users/${encodeURIComponent(pubkey)}/bookmarks`,
  userHighlightsByPubkey: (pubkey: string) =>
    `/api/v1/users/${encodeURIComponent(pubkey)}/highlights`,
  userMuteListByPubkey: (pubkey: string) => `/api/v1/users/${encodeURIComponent(pubkey)}/mute-list`,
  userMutedByByPubkey: (pubkey: string) => `/api/v1/users/${encodeURIComponent(pubkey)}/muted-by`,
  relatedProfilesByPubkey: (pubkey: string) =>
    `/api/v1/discovery/profiles/${encodeURIComponent(pubkey)}/related`,
  authorEventsByPubkey: (pubkey: string) => `/api/v1/authors/${encodeURIComponent(pubkey)}/events`,
  authorRepliesByPubkey: (pubkey: string) =>
    `/api/v1/authors/${encodeURIComponent(pubkey)}/replies`,
  authorReactionsByPubkey: (pubkey: string) =>
    `/api/v1/authors/${encodeURIComponent(pubkey)}/reactions`,
  authorZapsByPubkey: (pubkey: string) => `/api/v1/authors/${encodeURIComponent(pubkey)}/zaps`,
  eventById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}`,
  eventsBatch: "/api/v1/events/batch",
  eventAncestorsById: (eventId: string) =>
    `/api/v1/events/${encodeURIComponent(eventId)}/ancestors`,
  eventRepliesById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}/replies`,
  eventSeenOnById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}/seen-on`,
  eventCountsById: (eventId: string) => `/api/v1/events/${encodeURIComponent(eventId)}/counts`,
  threadByEventId: (eventId: string) => `/api/v1/threads/${encodeURIComponent(eventId)}`,
  threadSummaryByRootEventId: (rootEventId: string) =>
    `/api/v1/threads/${encodeURIComponent(rootEventId)}/summary`,
  threadActivityByRootEventId: (rootEventId: string) =>
    `/api/v1/threads/${encodeURIComponent(rootEventId)}/activity`,
  noteSummaryByEventId: (eventId: string) => `/api/v1/notes/${encodeURIComponent(eventId)}/summary`,
  noteRelatedByEventId: (eventId: string) => `/api/v1/notes/${encodeURIComponent(eventId)}/related`,
  trendingNotes: "/api/v1/discovery/notes/trending",
  trendingLongForm: "/api/v1/discovery/long-form/trending",
  trendingProfiles: "/api/v1/discovery/profiles/trending",
  hotConversations: "/api/v1/discovery/conversations/hot",
  risingProfiles: "/api/v1/discovery/profiles/rising",
  trendingHashtags: "/api/v1/discovery/hashtags/trending",
  trendingDomains: "/api/v1/discovery/domains/trending",
  hashtagByName: (hashtag: string) => `/api/v1/discovery/hashtags/${encodeURIComponent(hashtag)}`,
  hashtagNotesByName: (hashtag: string) =>
    `/api/v1/discovery/hashtags/${encodeURIComponent(hashtag)}/notes`,
  hashtagRelatedByName: (hashtag: string) =>
    `/api/v1/discovery/hashtags/${encodeURIComponent(hashtag)}/related`,
  domainByName: (domain: string) => `/api/v1/discovery/domains/${encodeURIComponent(domain)}`,
  domainNotesByName: (domain: string) =>
    `/api/v1/discovery/domains/${encodeURIComponent(domain)}/notes`,
  networkStats: "/api/v1/discovery/stats/network",
  contentStats: "/api/v1/discovery/stats/content",
  relayStats: "/api/v1/discovery/stats/relays",
  statsSeries: "/api/v1/discovery/stats/series",
  relayHealth: "/api/v1/relays/health",
  relayPopular: "/api/v1/relays/popular",
  relayProbeHealth: "/api/v1/relays/probe-health",
} as const;

export interface CursorQuery {
  cursor?: string;
  limit?: number;
  offset?: number;
  window?: string;
}

export interface OffsetQuery {
  limit?: number;
  offset?: number;
  window?: string;
}

export function buildOffsetQuery(
  query?: OffsetQuery
): Record<string, string | number | undefined> | undefined {
  if (!query) return undefined;
  return {
    limit: query.limit,
    offset: query.offset,
    window: query.window,
  };
}

export const normalizeSearchQueryText = (value: string): string =>
  value
    .trim()
    .replace(/^nostr:/i, "")
    .replace(/^@/, "");

export const normalizeProfileSearchQueryText = (value: string): string => {
  const normalized = normalizeSearchQueryText(value);
  if (!normalized.toLowerCase().startsWith("npub1")) return normalized;
  return npubToHex(normalized) ?? normalized;
};

export const looksLikeProfileIdentifier = (value: string): boolean =>
  /^npub1[02-9ac-hj-np-z]+$/i.test(value) || /^[0-9a-f]{64}$/i.test(value);

export const looksLikeEventIdentifier = (value: string): boolean => /^[0-9a-f]{64}$/i.test(value);

export function buildPubkeyCandidates(pubkey: string): string[] {
  const normalized = pubkey.trim().replace(/^nostr:/i, "");
  const isNpub = normalized.toLowerCase().startsWith("npub1");
  const decodedHex = isNpub ? npubToHex(normalized) : null;
  // Prefer hex first when an npub decodes, so the common path wins before a 404 retry.
  const ordered = decodedHex ? [decodedHex, normalized] : [normalized];
  return Array.from(
    new Set(ordered.filter((candidate): candidate is string => typeof candidate === "string"))
  );
}

/**
 * Try pubkey candidates (hex-first). Retry the alternate form only on 404;
 * never retry after timeouts or other failures.
 */
export async function withPubkeyCandidates<T>(
  pubkey: string,
  operation: (candidate: string) => Promise<T>,
  fallbackMessage = "Profile lookup failed."
): Promise<T> {
  const candidates = buildPubkeyCandidates(pubkey);
  let lastError: Error | null = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]!;
    try {
      return await operation(candidate);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(fallbackMessage);
      const isTimeout = isApiTimeoutError(error);
      const isNotFound = error instanceof ApiError && error.isNotFound;
      const hasNext = index < candidates.length - 1;
      if (!hasNext || isTimeout || !isNotFound) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error(fallbackMessage);
}

export function toSearchCursor(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    for (const key of ["next_cursor", "cursor", "continuation", "next"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.length > 0) return candidate;
    }
  }
  return undefined;
}

export function buildSearchQuery(
  query: Pick<SearchQuery, "q" | "limit" | "offset">
): Record<string, string | number | undefined> {
  return {
    q: query.q,
    limit: query.limit,
    offset: query.offset,
  };
}

export function normalizeDomainQuery(domain: string): string {
  const normalized = domain.trim().toLowerCase();
  if (normalized.length === 0) return "";
  const candidate = normalized.includes("://") ? normalized : `https://${normalized}`;
  try {
    return new URL(candidate).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    const hostname = normalized
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    return (hostname ?? "").replace(/\.$/, "");
  }
}

export const normalizeRelayHints = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [])
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (typeof entry === "object" && entry !== null) {
        const record = entry as Record<string, unknown>;
        for (const key of ["relay_url", "url", "host", "relay", "name"]) {
          const relay = record[key];
          if (typeof relay === "string" && relay.trim().length > 0) {
            return relay.trim();
          }
        }
      }
      return "";
    })
    .filter((relay) => relay.length > 0);

export function buildSearchSectionTotals(
  notesCount: number,
  profilesCount: number,
  profileSuggestionsCount: number,
  hashtagsCount: number,
  relaysCount: number
): NonNullable<SearchResponse["section_totals"]> {
  return {
    notes: notesCount,
    profiles: profilesCount,
    profile_suggestions: profileSuggestionsCount,
    hashtags: hashtagsCount,
    relays: relaysCount,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeHotConversationNotes(
  value: unknown
): ReturnType<typeof normalizeEventRecords> {
  const normalizedDirect = normalizeEventRecords(value).filter((note) => note.id.length > 0);
  if (normalizedDirect.length > 0) return normalizedDirect;
  if (!Array.isArray(value)) return [];

  const expanded = value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const candidate =
        entry.note ??
        entry.event ??
        entry.root ??
        entry.root_note ??
        entry.latest ??
        entry.last_event ??
        entry;
      if (isRecord(candidate)) {
        // Prefer nested note identity, but keep conversation-level engagement
        // (reply_count from thread_summaries; repost/reaction/zap from
        // note_discovery_stats) when the nested payload omits those fields.
        return normalizeEventRecord({
          ...candidate,
          id: candidate.id ?? entry.root_event_id ?? entry.event_id ?? entry.id,
          event_id: candidate.event_id ?? entry.root_event_id ?? entry.event_id,
          pubkey: candidate.pubkey ?? entry.pubkey ?? entry.author_pubkey,
          reply_count: candidate.reply_count ?? entry.reply_count,
          repost_count: candidate.repost_count ?? entry.repost_count,
          reaction_count: candidate.reaction_count ?? entry.reaction_count,
          zap_count: candidate.zap_count ?? entry.zap_count,
          zap_msats: candidate.zap_msats ?? entry.zap_msats,
        });
      }
      return normalizeEventRecord(candidate);
    })
    .filter((note): note is NonNullable<ReturnType<typeof normalizeEventRecord>> => note !== null)
    .filter((note) => note.id.length > 0);

  return Array.from(new Map(expanded.map((note) => [note.id, note])).values());
}

export function buildCursorQuery(
  query?: CursorQuery
): Record<string, string | number | undefined> | undefined {
  if (!query) return undefined;
  return {
    cursor: query.cursor,
    limit: query.limit,
    offset: query.offset,
    window: query.window,
  };
}
