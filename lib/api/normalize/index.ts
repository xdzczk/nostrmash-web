export { extractNativeApiSemantics } from "@/lib/api/normalize/helpers";

export {
  normalizeEventRecord,
  normalizeEventRecords,
  normalizeArticleRecord,
  normalizeArticleRecords,
  isAuthoredReplyEvent,
  filterAuthoredNotes,
  normalizeProfile,
  normalizeProfiles,
  normalizeProfileStats,
  normalizeHashtagEntry,
  normalizeHashtagEntries,
  normalizeDomainEntry,
  normalizeDomainEntries,
} from "@/lib/api/normalize/entities";

export {
  normalizeTrendingLongFormResponse,
  normalizeHashtagDetailResponse,
  normalizeHashtagNotesResponse,
  normalizeRelatedHashtagsResponse,
  normalizeDomainDetailResponse,
  normalizeDomainNotesResponse,
  normalizeDiscoveryHomeResponse,
} from "@/lib/api/normalize/discovery";

export {
  normalizeUserLongFormResponse,
  normalizeUserBookmarksResponse,
  normalizeUserHighlightsResponse,
  normalizeUserMuteListResponse,
  normalizeUserMutedByResponse,
  normalizeProfileSummaryResponse,
  normalizeAuthorEventsResponse,
  normalizeAuthorRepliesResponse,
  normalizeAuthorReactionsResponse,
  normalizeAuthorZapsResponse,
  normalizeRelatedProfilesResponse,
} from "@/lib/api/normalize/profiles";

export { normalizeRelayHealthResponse } from "@/lib/api/normalize/relays";

export {
  normalizeThreadResponse,
  normalizeEventAncestorsResponse,
  normalizeEventRepliesResponse,
  normalizeThreadSummaryResponse,
  normalizeThreadActivityResponse,
  normalizeRelatedNotesResponse,
  normalizeNoteSummaryResponse,
  normalizeEventSeenOnResponse,
  normalizeEventCountsResponse,
} from "@/lib/api/normalize/notes";
