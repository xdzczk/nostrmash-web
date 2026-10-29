export { extractNativeApiSemantics } from "@/lib/api/normalize/helpers";

export {
  normalizeEventRecord,
  normalizeEventRecords,
  normalizeArticleRecord,
  normalizeArticleRecords,
  isHiddenNoteKind,
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
  applyDomainTrendWindows,
  normalizeDiscoveryHomeResponse,
  normalizeDiscoveryLanguageFields,
  normalizeTopLanguages,
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
  normalizeUserMediaResponse,
  normalizeUserLiveActivitiesResponse,
  normalizeUserPinsResponse,
  normalizeLiveActivitiesResponse,
  normalizeEventCommentsResponse,
  normalizeReportsResponse,
} from "@/lib/api/normalize/social";

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
