import { cache } from "react";

import { isRecord } from "@/lib/api/normalize/helpers";
import {
  getAuthorEvents,
  getAuthorReactions,
  getAuthorReplies,
  getAuthorZaps,
  getProfile,
  getProfileSummary,
  getRelatedProfiles,
  getRisingProfiles,
  getUserBookmarks,
  getUserHighlights,
  getUserLongForm,
  getUserMuteList,
  getUserMutedBy,
} from "@/lib/api/endpoints";
import {
  extractNativeApiSemantics,
  filterAuthoredNotes,
  normalizeEventRecords,
  normalizeProfiles,
} from "@/lib/api/normalize";
import {
  extractEventAuthorPubkeys,
  fetchEventsById,
  fetchProfilesByPubkey,
} from "@/lib/api/profile-hydration";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import {
  buildProfileActivityContinuationHref,
  buildProfileActivityTabHref,
  parseProfileActivityTab,
  PROFILE_ACTIVITY_TABS,
  type ProfileActivityTab,
} from "@/lib/profile/activity-tabs";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import type { Profile } from "@/lib/types/api";

export const getProfileSummaryCached = cache(async (pubkeyOrNpub: string) =>
  getProfileSummary(pubkeyOrNpub, "shortTtl")
);

function hasIdentityMetadata(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return [
    profile.display_name,
    profile.name,
    profile.about,
    profile.picture,
    profile.nip05,
    profile.lud16,
    profile.website,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
}

function isNotFoundReason(reason: unknown): boolean {
  return reason instanceof Error && /API 404:/i.test(reason.message);
}

function mergeProfile(
  summaryProfile: Profile | null,
  enrichedProfile: Profile | null
): Profile | null {
  if (!summaryProfile && !enrichedProfile) return null;
  if (!summaryProfile) return enrichedProfile;
  if (!enrichedProfile) return summaryProfile;
  return {
    ...enrichedProfile,
    ...summaryProfile,
    pubkey: summaryProfile.pubkey || enrichedProfile.pubkey,
  };
}

export async function loadProfilePageData(
  pubkeyOrNpub: string,
  resolvedSearchParams: Record<string, string | string[] | undefined>
) {
  const notesCursor = readSearchParam(resolvedSearchParams, "notes_cursor");
  const repliesCursor = readSearchParam(resolvedSearchParams, "replies_cursor");
  const reactionsCursor = readSearchParam(resolvedSearchParams, "reactions_cursor");
  const zapsCursor = readSearchParam(resolvedSearchParams, "zaps_cursor");
  const longFormCursor = readSearchParam(resolvedSearchParams, "long_form_cursor");
  const bookmarksCursor = readSearchParam(resolvedSearchParams, "bookmarks_cursor");
  const highlightsCursor = readSearchParam(resolvedSearchParams, "highlights_cursor");
  const muteListCursor = readSearchParam(resolvedSearchParams, "mute_list_cursor");
  const mutedByCursor = readSearchParam(resolvedSearchParams, "muted_by_cursor");
  const relatedProfilesCursor = readSearchParam(resolvedSearchParams, "related_profiles_cursor");
  const activityTab = parseProfileActivityTab(readSearchParam(resolvedSearchParams, "activity"));
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const profileRoute = `/profiles/${encodeURIComponent(pubkeyOrNpub)}`;

  const errors: string[] = [];
  let summary: Awaited<ReturnType<typeof getProfileSummary>> | null = null;
  let profileEnrichment: Awaited<ReturnType<typeof getProfile>> | null = null;
  let authoredNotesPayload: Awaited<ReturnType<typeof getAuthorEvents>> | null = null;
  let authoredRepliesPayload: Awaited<ReturnType<typeof getAuthorReplies>> | null = null;
  let authoredReactionsPayload: Awaited<ReturnType<typeof getAuthorReactions>> | null = null;
  let authoredZapsPayload: Awaited<ReturnType<typeof getAuthorZaps>> | null = null;
  let longFormPayload: Awaited<ReturnType<typeof getUserLongForm>> | null = null;
  let bookmarksPayload: Awaited<ReturnType<typeof getUserBookmarks>> | null = null;
  let highlightsPayload: Awaited<ReturnType<typeof getUserHighlights>> | null = null;
  let muteListPayload: Awaited<ReturnType<typeof getUserMuteList>> | null = null;
  let mutedByPayload: Awaited<ReturnType<typeof getUserMutedBy>> | null = null;
  let relatedProfilesFallbackPayload: Awaited<ReturnType<typeof getRelatedProfiles>> | null = null;
  let risingProfilesPayload: Awaited<ReturnType<typeof getRisingProfiles>> | null = null;

  const summaryResult = await Promise.allSettled([getProfileSummaryCached(pubkeyOrNpub)]);
  if (summaryResult[0].status === "fulfilled") {
    summary = summaryResult[0].value;
  } else {
    errors.push(
      toUserFacingErrorMessage(summaryResult[0].reason, "Failed to load profile summary.")
    );
  }

  const summaryRecord = isRecord(summary) ? summary : null;
  const summaryProfile = summary ? (summary.profile ?? (summary as unknown as Profile)) : null;
  const lookupKey = summaryProfile?.pubkey ?? summary?.pubkey ?? pubkeyOrNpub;

  const summaryRelatedDiscovery = isRecord(summaryRecord?.related_discovery)
    ? summaryRecord.related_discovery
    : null;
  const summaryRelatedProfiles = normalizeProfiles(summaryRelatedDiscovery?.related_profiles);
  const summaryRisingProfiles = normalizeProfiles(summaryRelatedDiscovery?.rising_profiles);

  const shouldEnrichProfile = !hasIdentityMetadata(summaryProfile);
  const shouldLoadReplies = activityTab === "replies" || typeof repliesCursor === "string";
  const shouldLoadReactions = activityTab === "reactions" || typeof reactionsCursor === "string";
  const shouldLoadZaps = activityTab === "zaps" || typeof zapsCursor === "string";
  const shouldLoadLongForm = activityTab === "long_form" || typeof longFormCursor === "string";
  const shouldLoadBookmarks = activityTab === "bookmarks" || typeof bookmarksCursor === "string";
  const shouldLoadHighlights = activityTab === "highlights" || typeof highlightsCursor === "string";
  const shouldLoadMuteList = activityTab === "mute_list" || typeof muteListCursor === "string";
  const shouldLoadMutedBy = activityTab === "muted_by" || typeof mutedByCursor === "string";
  const shouldLoadRelatedProfilesFallback =
    typeof relatedProfilesCursor === "string" || summaryRelatedProfiles.length === 0;
  const shouldLoadRisingProfilesFallback = summaryRisingProfiles.length === 0;

  const [
    profileResult,
    notesResult,
    repliesResult,
    reactionsResult,
    zapsResult,
    longFormResult,
    bookmarksResult,
    highlightsResult,
    muteListResult,
    mutedByResult,
    relatedFallbackResult,
    risingProfilesResult,
  ] = await Promise.allSettled([
    shouldEnrichProfile ? getProfile(lookupKey, "shortTtl") : Promise.resolve(null),
    getAuthorEvents(lookupKey, "shortTtl", { cursor: notesCursor }),
    shouldLoadReplies
      ? getAuthorReplies(lookupKey, "shortTtl", { cursor: repliesCursor })
      : Promise.resolve(null),
    shouldLoadReactions
      ? getAuthorReactions(lookupKey, "shortTtl", { cursor: reactionsCursor })
      : Promise.resolve(null),
    shouldLoadZaps
      ? getAuthorZaps(lookupKey, "shortTtl", { cursor: zapsCursor })
      : Promise.resolve(null),
    shouldLoadLongForm
      ? getUserLongForm(lookupKey, "shortTtl", { cursor: longFormCursor })
      : Promise.resolve(null),
    shouldLoadBookmarks
      ? getUserBookmarks(lookupKey, "shortTtl", { cursor: bookmarksCursor })
      : Promise.resolve(null),
    shouldLoadHighlights
      ? getUserHighlights(lookupKey, "shortTtl", { cursor: highlightsCursor })
      : Promise.resolve(null),
    shouldLoadMuteList
      ? getUserMuteList(lookupKey, "shortTtl", { cursor: muteListCursor })
      : Promise.resolve(null),
    shouldLoadMutedBy
      ? getUserMutedBy(lookupKey, "shortTtl", { cursor: mutedByCursor })
      : Promise.resolve(null),
    shouldLoadRelatedProfilesFallback
      ? getRelatedProfiles(lookupKey, "shortTtl", { cursor: relatedProfilesCursor })
      : Promise.resolve(null),
    shouldLoadRisingProfilesFallback ? getRisingProfiles("shortTtl") : Promise.resolve(null),
  ]);

  if (profileResult.status === "fulfilled") {
    profileEnrichment = profileResult.value;
  } else if (shouldEnrichProfile) {
    errors.push(
      toUserFacingErrorMessage(profileResult.reason, "Failed to enrich profile metadata.")
    );
  }
  if (notesResult.status === "fulfilled") {
    authoredNotesPayload = notesResult.value;
  } else if (!isNotFoundReason(notesResult.reason)) {
    errors.push(toUserFacingErrorMessage(notesResult.reason, "Failed to load recent notes."));
  }
  if (repliesResult.status === "fulfilled") {
    authoredRepliesPayload = repliesResult.value;
  } else if (shouldLoadReplies && !isNotFoundReason(repliesResult.reason)) {
    errors.push(toUserFacingErrorMessage(repliesResult.reason, "Failed to load recent replies."));
  }
  if (reactionsResult.status === "fulfilled") {
    authoredReactionsPayload = reactionsResult.value;
  } else if (shouldLoadReactions && !isNotFoundReason(reactionsResult.reason)) {
    errors.push(
      toUserFacingErrorMessage(reactionsResult.reason, "Failed to load recent reactions.")
    );
  }
  if (zapsResult.status === "fulfilled") {
    authoredZapsPayload = zapsResult.value;
  } else if (shouldLoadZaps && !isNotFoundReason(zapsResult.reason)) {
    errors.push(toUserFacingErrorMessage(zapsResult.reason, "Failed to load recent zaps."));
  }
  if (longFormResult.status === "fulfilled") {
    longFormPayload = longFormResult.value;
  } else if (shouldLoadLongForm && !isNotFoundReason(longFormResult.reason)) {
    errors.push(
      toUserFacingErrorMessage(longFormResult.reason, "Failed to load long-form articles.")
    );
  }
  if (bookmarksResult.status === "fulfilled") {
    bookmarksPayload = bookmarksResult.value;
  } else if (shouldLoadBookmarks && !isNotFoundReason(bookmarksResult.reason)) {
    errors.push(toUserFacingErrorMessage(bookmarksResult.reason, "Failed to load bookmarks."));
  }
  if (highlightsResult.status === "fulfilled") {
    highlightsPayload = highlightsResult.value;
  } else if (shouldLoadHighlights && !isNotFoundReason(highlightsResult.reason)) {
    errors.push(toUserFacingErrorMessage(highlightsResult.reason, "Failed to load highlights."));
  }
  if (muteListResult.status === "fulfilled") {
    muteListPayload = muteListResult.value;
  } else if (shouldLoadMuteList && !isNotFoundReason(muteListResult.reason)) {
    errors.push(toUserFacingErrorMessage(muteListResult.reason, "Failed to load mute list."));
  }
  if (mutedByResult.status === "fulfilled") {
    mutedByPayload = mutedByResult.value;
  } else if (shouldLoadMutedBy && !isNotFoundReason(mutedByResult.reason)) {
    errors.push(
      toUserFacingErrorMessage(mutedByResult.reason, "Failed to load muted-by accounts.")
    );
  }
  if (relatedFallbackResult.status === "fulfilled") {
    relatedProfilesFallbackPayload = relatedFallbackResult.value;
  } else if (shouldLoadRelatedProfilesFallback && !isNotFoundReason(relatedFallbackResult.reason)) {
    errors.push(
      toUserFacingErrorMessage(relatedFallbackResult.reason, "Failed to load related profiles.")
    );
  }
  if (risingProfilesResult.status === "fulfilled") {
    risingProfilesPayload = risingProfilesResult.value;
  } else if (shouldLoadRisingProfilesFallback && !isNotFoundReason(risingProfilesResult.reason)) {
    errors.push(
      toUserFacingErrorMessage(risingProfilesResult.reason, "Failed to load rising profiles.")
    );
  }

  const profile = mergeProfile(summaryProfile, profileEnrichment);
  const summaryRecentNotePreviews = filterAuthoredNotes(
    normalizeEventRecords(summaryRecord?.recent_note_previews ?? summaryRecord?.recent_notes)
  );
  const notes =
    authoredNotesPayload?.events && authoredNotesPayload.events.length > 0
      ? filterAuthoredNotes(authoredNotesPayload.events)
      : summaryRecentNotePreviews;
  const replies = authoredRepliesPayload?.replies ?? [];
  const reactions = authoredReactionsPayload?.reactions ?? [];
  const zaps = authoredZapsPayload?.zaps ?? [];
  const longFormArticles = longFormPayload?.articles ?? [];
  const bookmarks = bookmarksPayload?.events ?? [];
  const highlights = highlightsPayload?.highlights ?? [];
  const mutedProfiles = muteListPayload?.profiles ?? [];
  const mutedByProfiles = mutedByPayload?.profiles ?? [];
  const semantics = extractNativeApiSemantics(
    summary,
    profileEnrichment,
    authoredNotesPayload,
    authoredRepliesPayload,
    authoredReactionsPayload,
    authoredZapsPayload
  );
  const relatedProfiles =
    summaryRelatedProfiles.length > 0
      ? summaryRelatedProfiles
      : (relatedProfilesFallbackPayload?.related_profiles ?? []);
  const risingProfiles =
    summaryRisingProfiles.length > 0
      ? summaryRisingProfiles
      : (risingProfilesPayload?.profiles ?? []);

  const notesNextCursor = extractNativeApiSemantics(authoredNotesPayload).next_cursor;
  const repliesNextCursor = extractNativeApiSemantics(authoredRepliesPayload).next_cursor;
  const reactionsNextCursor = extractNativeApiSemantics(authoredReactionsPayload).next_cursor;
  const zapsNextCursor = extractNativeApiSemantics(authoredZapsPayload).next_cursor;
  const longFormNextCursor = extractNativeApiSemantics(longFormPayload).next_cursor;
  const bookmarksNextCursor = extractNativeApiSemantics(bookmarksPayload).next_cursor;
  const highlightsNextCursor = extractNativeApiSemantics(highlightsPayload).next_cursor;
  const muteListNextCursor = extractNativeApiSemantics(muteListPayload).next_cursor;
  const mutedByNextCursor = extractNativeApiSemantics(mutedByPayload).next_cursor;
  const relatedProfilesNextCursor = extractNativeApiSemantics(
    relatedProfilesFallbackPayload
  ).next_cursor;
  const activityTabs = PROFILE_ACTIVITY_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    href: buildProfileActivityTabHref(profileRoute, currentSearchParams, tab.id),
  }));
  const activityNextCursorByTab: Record<ProfileActivityTab, string | undefined> = {
    notes: notesNextCursor,
    replies: repliesNextCursor,
    reactions: reactionsNextCursor,
    zaps: zapsNextCursor,
    long_form: longFormNextCursor,
    bookmarks: bookmarksNextCursor,
    highlights: highlightsNextCursor,
    mute_list: muteListNextCursor,
    muted_by: mutedByNextCursor,
  };
  const activityContinuationByTab: Record<ProfileActivityTab, string> = {
    notes: buildProfileActivityContinuationHref(
      profileRoute,
      currentSearchParams,
      "notes",
      notesNextCursor
    ),
    replies: buildProfileActivityContinuationHref(
      profileRoute,
      currentSearchParams,
      "replies",
      repliesNextCursor
    ),
    reactions: buildProfileActivityContinuationHref(
      profileRoute,
      currentSearchParams,
      "reactions",
      reactionsNextCursor
    ),
    zaps: buildProfileActivityContinuationHref(
      profileRoute,
      currentSearchParams,
      "zaps",
      zapsNextCursor
    ),
    long_form: buildProfileActivityContinuationHref(
      profileRoute,
      currentSearchParams,
      "long_form",
      longFormNextCursor
    ),
    bookmarks: buildProfileActivityContinuationHref(
      profileRoute,
      currentSearchParams,
      "bookmarks",
      bookmarksNextCursor
    ),
    highlights: buildProfileActivityContinuationHref(
      profileRoute,
      currentSearchParams,
      "highlights",
      highlightsNextCursor
    ),
    mute_list: buildProfileActivityContinuationHref(
      profileRoute,
      currentSearchParams,
      "mute_list",
      muteListNextCursor
    ),
    muted_by: buildProfileActivityContinuationHref(
      profileRoute,
      currentSearchParams,
      "muted_by",
      mutedByNextCursor
    ),
  };
  const relatedProfilesContinuationHref = buildContinuationHref(
    profileRoute,
    currentSearchParams,
    "related_profiles_cursor",
    relatedProfilesNextCursor
  );

  const targetEventIds = [...reactions, ...zaps].flatMap((entry) => {
    const ids: string[] = [];
    if (typeof entry.target_event_id === "string" && entry.target_event_id.length > 0) {
      ids.push(entry.target_event_id);
    }
    const embedded = entry.target_event ?? entry.target_note;
    if (embedded && typeof embedded.id === "string" && embedded.id.length > 0) {
      ids.push(embedded.id);
    }
    return ids;
  });
  const targetNotesById =
    targetEventIds.length > 0 ? await fetchEventsById(targetEventIds, "shortTtl") : {};
  const targetNoteAuthorsByPubkey =
    Object.keys(targetNotesById).length > 0
      ? await fetchProfilesByPubkey(
          extractEventAuthorPubkeys(Object.values(targetNotesById)),
          "shortTtl"
        )
      : {};

  const eventListAuthorPubkeys = extractEventAuthorPubkeys([
    ...longFormArticles,
    ...bookmarks,
    ...highlights,
  ]);
  const eventListAuthorsByPubkey =
    eventListAuthorPubkeys.length > 0
      ? await fetchProfilesByPubkey(eventListAuthorPubkeys, "shortTtl")
      : {};

  const notesAuthorMap =
    profile?.pubkey && profile.pubkey.length > 0
      ? { [profile.pubkey.toLowerCase()]: profile }
      : undefined;
  const activeTabMeta = PROFILE_ACTIVITY_TABS.find((tab) => tab.id === activityTab);
  const activeNextCursor = activityNextCursorByTab[activityTab];
  const activeContinuationHref = activityContinuationByTab[activityTab];
  const errorMessage = errors.length > 0 ? errors.join(" | ") : "";

  return {
    activityTab,
    activityTabs,
    activeContinuationHref,
    activeNextCursor,
    activeTabMeta,
    authoredNotesPayload,
    authoredReactionsPayload,
    authoredRepliesPayload,
    authoredZapsPayload,
    bookmarks,
    bookmarksPayload,
    currentSearchParams,
    errorMessage,
    eventListAuthorsByPubkey,
    highlights,
    highlightsPayload,
    longFormArticles,
    longFormPayload,
    lookupKey,
    muteListPayload,
    mutedByPayload,
    mutedByProfiles,
    mutedProfiles,
    notes,
    notesAuthorMap,
    profile,
    profileEnrichment,
    profileRoute,
    reactions,
    relatedProfiles,
    relatedProfilesContinuationHref,
    relatedProfilesFallbackPayload,
    relatedProfilesNextCursor,
    replies,
    risingProfiles,
    risingProfilesPayload,
    semantics,
    summary,
    summaryRecord,
    targetNoteAuthorsByPubkey,
    targetNotesById,
    zaps,
  };
}
