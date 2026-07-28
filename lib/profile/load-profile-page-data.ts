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
import { summarizeLoadErrors, toUserFacingErrorMessage } from "@/lib/errors/user-message";
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

function readActivitySearchParams(
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
  const activityTab = parseProfileActivityTab(readSearchParam(resolvedSearchParams, "activity"));
  return {
    activityTab,
    notesCursor,
    repliesCursor,
    reactionsCursor,
    zapsCursor,
    longFormCursor,
    bookmarksCursor,
    highlightsCursor,
    muteListCursor,
    mutedByCursor,
    shouldLoadReplies: activityTab === "replies" || typeof repliesCursor === "string",
    shouldLoadReactions: activityTab === "reactions" || typeof reactionsCursor === "string",
    shouldLoadZaps: activityTab === "zaps" || typeof zapsCursor === "string",
    shouldLoadLongForm: activityTab === "long_form" || typeof longFormCursor === "string",
    shouldLoadBookmarks: activityTab === "bookmarks" || typeof bookmarksCursor === "string",
    shouldLoadHighlights: activityTab === "highlights" || typeof highlightsCursor === "string",
    shouldLoadMuteList: activityTab === "mute_list" || typeof muteListCursor === "string",
    shouldLoadMutedBy: activityTab === "muted_by" || typeof mutedByCursor === "string",
  };
}

/** Fast path: summary + optional profile enrichment only. */
export async function loadProfileFocalData(pubkeyOrNpub: string) {
  const errors: string[] = [];
  let summary: Awaited<ReturnType<typeof getProfileSummary>> | null = null;
  let profileEnrichment: Awaited<ReturnType<typeof getProfile>> | null = null;

  try {
    summary = await getProfileSummaryCached(pubkeyOrNpub);
  } catch (error) {
    errors.push(toUserFacingErrorMessage(error, "Failed to load profile summary."));
  }

  const summaryRecord = isRecord(summary) ? summary : null;
  const summaryProfile = summary ? (summary.profile ?? (summary as unknown as Profile)) : null;
  const lookupKey = summaryProfile?.pubkey ?? summary?.pubkey ?? pubkeyOrNpub;
  const profileRoute = `/profiles/${encodeURIComponent(pubkeyOrNpub)}`;

  const shouldEnrichProfile = !hasIdentityMetadata(summaryProfile);
  if (shouldEnrichProfile) {
    try {
      profileEnrichment = await getProfile(lookupKey, "shortTtl");
    } catch (error) {
      errors.push(toUserFacingErrorMessage(error, "Failed to enrich profile metadata."));
    }
  }

  const profile = mergeProfile(summaryProfile, profileEnrichment);
  const semantics = extractNativeApiSemantics(summary, profileEnrichment);

  return {
    summary,
    summaryRecord,
    profile,
    lookupKey,
    profileEnrichment,
    semantics,
    errorMessage: summarizeLoadErrors(errors) ?? "",
    profileRoute,
  };
}

export async function loadProfileActivityData(
  {
    lookupKey,
    profile,
    profileRoute,
    summaryRecord,
  }: {
    lookupKey: string;
    profile: Profile | null;
    profileRoute: string;
    summaryRecord: Record<string, unknown> | null;
  },
  resolvedSearchParams: Record<string, string | string[] | undefined>
) {
  const params = readActivitySearchParams(resolvedSearchParams);
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const errors: string[] = [];

  let authoredNotesPayload: Awaited<ReturnType<typeof getAuthorEvents>> | null = null;
  let authoredRepliesPayload: Awaited<ReturnType<typeof getAuthorReplies>> | null = null;
  let authoredReactionsPayload: Awaited<ReturnType<typeof getAuthorReactions>> | null = null;
  let authoredZapsPayload: Awaited<ReturnType<typeof getAuthorZaps>> | null = null;
  let longFormPayload: Awaited<ReturnType<typeof getUserLongForm>> | null = null;
  let bookmarksPayload: Awaited<ReturnType<typeof getUserBookmarks>> | null = null;
  let highlightsPayload: Awaited<ReturnType<typeof getUserHighlights>> | null = null;
  let muteListPayload: Awaited<ReturnType<typeof getUserMuteList>> | null = null;
  let mutedByPayload: Awaited<ReturnType<typeof getUserMutedBy>> | null = null;

  const [
    notesResult,
    repliesResult,
    reactionsResult,
    zapsResult,
    longFormResult,
    bookmarksResult,
    highlightsResult,
    muteListResult,
    mutedByResult,
  ] = await Promise.allSettled([
    getAuthorEvents(lookupKey, "shortTtl", { cursor: params.notesCursor }),
    params.shouldLoadReplies
      ? getAuthorReplies(lookupKey, "shortTtl", { cursor: params.repliesCursor })
      : Promise.resolve(null),
    params.shouldLoadReactions
      ? getAuthorReactions(lookupKey, "shortTtl", { cursor: params.reactionsCursor })
      : Promise.resolve(null),
    params.shouldLoadZaps
      ? getAuthorZaps(lookupKey, "shortTtl", { cursor: params.zapsCursor })
      : Promise.resolve(null),
    params.shouldLoadLongForm
      ? getUserLongForm(lookupKey, "shortTtl", { cursor: params.longFormCursor })
      : Promise.resolve(null),
    params.shouldLoadBookmarks
      ? getUserBookmarks(lookupKey, "shortTtl", { cursor: params.bookmarksCursor })
      : Promise.resolve(null),
    params.shouldLoadHighlights
      ? getUserHighlights(lookupKey, "shortTtl", { cursor: params.highlightsCursor })
      : Promise.resolve(null),
    params.shouldLoadMuteList
      ? getUserMuteList(lookupKey, "shortTtl", { cursor: params.muteListCursor })
      : Promise.resolve(null),
    params.shouldLoadMutedBy
      ? getUserMutedBy(lookupKey, "shortTtl", { cursor: params.mutedByCursor })
      : Promise.resolve(null),
  ]);

  if (notesResult.status === "fulfilled") {
    authoredNotesPayload = notesResult.value;
  } else if (!isNotFoundReason(notesResult.reason)) {
    errors.push(toUserFacingErrorMessage(notesResult.reason, "Failed to load recent notes."));
  }
  if (repliesResult.status === "fulfilled") {
    authoredRepliesPayload = repliesResult.value;
  } else if (params.shouldLoadReplies && !isNotFoundReason(repliesResult.reason)) {
    errors.push(toUserFacingErrorMessage(repliesResult.reason, "Failed to load recent replies."));
  }
  if (reactionsResult.status === "fulfilled") {
    authoredReactionsPayload = reactionsResult.value;
  } else if (params.shouldLoadReactions && !isNotFoundReason(reactionsResult.reason)) {
    errors.push(
      toUserFacingErrorMessage(reactionsResult.reason, "Failed to load recent reactions.")
    );
  }
  if (zapsResult.status === "fulfilled") {
    authoredZapsPayload = zapsResult.value;
  } else if (params.shouldLoadZaps && !isNotFoundReason(zapsResult.reason)) {
    errors.push(toUserFacingErrorMessage(zapsResult.reason, "Failed to load recent zaps."));
  }
  if (longFormResult.status === "fulfilled") {
    longFormPayload = longFormResult.value;
  } else if (params.shouldLoadLongForm && !isNotFoundReason(longFormResult.reason)) {
    errors.push(
      toUserFacingErrorMessage(longFormResult.reason, "Failed to load long-form articles.")
    );
  }
  if (bookmarksResult.status === "fulfilled") {
    bookmarksPayload = bookmarksResult.value;
  } else if (params.shouldLoadBookmarks && !isNotFoundReason(bookmarksResult.reason)) {
    errors.push(toUserFacingErrorMessage(bookmarksResult.reason, "Failed to load bookmarks."));
  }
  if (highlightsResult.status === "fulfilled") {
    highlightsPayload = highlightsResult.value;
  } else if (params.shouldLoadHighlights && !isNotFoundReason(highlightsResult.reason)) {
    errors.push(toUserFacingErrorMessage(highlightsResult.reason, "Failed to load highlights."));
  }
  if (muteListResult.status === "fulfilled") {
    muteListPayload = muteListResult.value;
  } else if (params.shouldLoadMuteList && !isNotFoundReason(muteListResult.reason)) {
    errors.push(toUserFacingErrorMessage(muteListResult.reason, "Failed to load mute list."));
  }
  if (mutedByResult.status === "fulfilled") {
    mutedByPayload = mutedByResult.value;
  } else if (params.shouldLoadMutedBy && !isNotFoundReason(mutedByResult.reason)) {
    errors.push(
      toUserFacingErrorMessage(mutedByResult.reason, "Failed to load muted-by accounts.")
    );
  }

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

  const notesNextCursor = extractNativeApiSemantics(authoredNotesPayload).next_cursor;
  const repliesNextCursor = extractNativeApiSemantics(authoredRepliesPayload).next_cursor;
  const reactionsNextCursor = extractNativeApiSemantics(authoredReactionsPayload).next_cursor;
  const zapsNextCursor = extractNativeApiSemantics(authoredZapsPayload).next_cursor;
  const longFormNextCursor = extractNativeApiSemantics(longFormPayload).next_cursor;
  const bookmarksNextCursor = extractNativeApiSemantics(bookmarksPayload).next_cursor;
  const highlightsNextCursor = extractNativeApiSemantics(highlightsPayload).next_cursor;
  const muteListNextCursor = extractNativeApiSemantics(muteListPayload).next_cursor;
  const mutedByNextCursor = extractNativeApiSemantics(mutedByPayload).next_cursor;

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
  const activeTabMeta = PROFILE_ACTIVITY_TABS.find((tab) => tab.id === params.activityTab);
  const activeNextCursor = activityNextCursorByTab[params.activityTab];
  const activeContinuationHref = activityContinuationByTab[params.activityTab];

  return {
    activityTab: params.activityTab,
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
    errorMessage: summarizeLoadErrors(errors) ?? "",
    eventListAuthorsByPubkey,
    highlights,
    highlightsPayload,
    longFormArticles,
    longFormPayload,
    muteListPayload,
    mutedByPayload,
    mutedByProfiles,
    mutedProfiles,
    notes,
    notesAuthorMap,
    reactions,
    replies,
    targetNoteAuthorsByPubkey,
    targetNotesById,
    zaps,
  };
}

export async function loadProfileDiscoveryData(
  {
    lookupKey,
    summaryRecord,
    profileRoute,
  }: {
    lookupKey: string;
    summaryRecord: Record<string, unknown> | null;
    profileRoute: string;
  },
  resolvedSearchParams: Record<string, string | string[] | undefined>
) {
  const relatedProfilesCursor = readSearchParam(resolvedSearchParams, "related_profiles_cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const errors: string[] = [];

  const summaryRelatedDiscovery = isRecord(summaryRecord?.related_discovery)
    ? summaryRecord.related_discovery
    : null;
  const summaryRelatedProfiles = normalizeProfiles(summaryRelatedDiscovery?.related_profiles);
  const summaryRisingProfiles = normalizeProfiles(summaryRelatedDiscovery?.rising_profiles);

  const shouldLoadRelatedProfilesFallback =
    typeof relatedProfilesCursor === "string" || summaryRelatedProfiles.length === 0;
  const shouldLoadRisingProfilesFallback = summaryRisingProfiles.length === 0;

  let relatedProfilesFallbackPayload: Awaited<ReturnType<typeof getRelatedProfiles>> | null = null;
  let risingProfilesPayload: Awaited<ReturnType<typeof getRisingProfiles>> | null = null;

  const [relatedFallbackResult, risingProfilesResult] = await Promise.allSettled([
    shouldLoadRelatedProfilesFallback
      ? getRelatedProfiles(lookupKey, "shortTtl", { cursor: relatedProfilesCursor })
      : Promise.resolve(null),
    shouldLoadRisingProfilesFallback ? getRisingProfiles("shortTtl") : Promise.resolve(null),
  ]);

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

  const relatedProfiles =
    summaryRelatedProfiles.length > 0
      ? summaryRelatedProfiles
      : (relatedProfilesFallbackPayload?.related_profiles ?? []);
  const risingProfiles =
    summaryRisingProfiles.length > 0
      ? summaryRisingProfiles
      : (risingProfilesPayload?.profiles ?? []);
  const relatedProfilesNextCursor = extractNativeApiSemantics(
    relatedProfilesFallbackPayload
  ).next_cursor;
  const relatedProfilesContinuationHref = buildContinuationHref(
    profileRoute,
    currentSearchParams,
    "related_profiles_cursor",
    relatedProfilesNextCursor
  );

  return {
    errorMessage: summarizeLoadErrors(errors) ?? "",
    relatedProfiles,
    relatedProfilesContinuationHref,
    relatedProfilesFallbackPayload,
    relatedProfilesNextCursor,
    risingProfiles,
    risingProfilesPayload,
  };
}

/** Full loader kept for unit tests and any non-streaming callers. */
export async function loadProfilePageData(
  pubkeyOrNpub: string,
  resolvedSearchParams: Record<string, string | string[] | undefined>
) {
  const focal = await loadProfileFocalData(pubkeyOrNpub);
  const [activity, discovery] = await Promise.all([
    loadProfileActivityData(
      {
        lookupKey: focal.lookupKey,
        profile: focal.profile,
        profileRoute: focal.profileRoute,
        summaryRecord: focal.summaryRecord,
      },
      resolvedSearchParams
    ),
    loadProfileDiscoveryData(
      {
        lookupKey: focal.lookupKey,
        summaryRecord: focal.summaryRecord,
        profileRoute: focal.profileRoute,
      },
      resolvedSearchParams
    ),
  ]);

  const semantics = extractNativeApiSemantics(
    focal.summary,
    focal.profileEnrichment,
    activity.authoredNotesPayload,
    activity.authoredRepliesPayload,
    activity.authoredReactionsPayload,
    activity.authoredZapsPayload
  );

  return {
    ...focal,
    ...activity,
    ...discovery,
    currentSearchParams: toUrlSearchParams(resolvedSearchParams),
    errorMessage:
      summarizeLoadErrors([focal.errorMessage, activity.errorMessage, discovery.errorMessage]) ??
      "",
    semantics,
  };
}
