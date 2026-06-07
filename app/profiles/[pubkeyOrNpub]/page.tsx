import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";

import { ArticlesList, NotesList, ProfilesList } from "@/components/data/renderers";
import { ProfileActivityTabs } from "@/components/profile/profile-activity-tabs";
import {
  ProfileReactionsActivityList,
  ProfileZapsActivityList,
} from "@/components/profile/profile-engagement-activity-list";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import {
  isRecord,
  profileFallbackAvatarDataUrl,
  profileLabel,
  profilePictureUrl,
  truncateMiddle,
} from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
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
import type { Profile, ProfileStats } from "@/lib/types/api";

type Params = Promise<{ pubkeyOrNpub: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type MetadataPrimitiveValue = {
  raw?: string;
  display?: string;
  copyable?: boolean;
  truncated?: boolean;
};

type HeroAction = {
  id: string;
  label: string;
  href: string;
};

const getProfileSummaryCached = cache(async (pubkeyOrNpub: string) =>
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

function asMetadataPrimitiveValue(value: unknown): MetadataPrimitiveValue | null {
  if (!isRecord(value)) return null;
  const raw = typeof value.raw === "string" ? value.raw : undefined;
  const display = typeof value.display === "string" ? value.display : undefined;
  const copyable = typeof value.copyable === "boolean" ? value.copyable : undefined;
  const truncated = typeof value.truncated === "boolean" ? value.truncated : undefined;
  if (!raw && !display) return null;
  return { raw, display, copyable, truncated };
}

function normalizeHeroActions(value: unknown): HeroAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const id = typeof entry.id === "string" ? entry.id : "";
      const label = typeof entry.label === "string" ? entry.label : "";
      const href = typeof entry.href === "string" ? entry.href : "";
      if (!label || !href) return null;
      return {
        id: id || label.toLowerCase().replace(/\s+/g, "_"),
        label,
        href,
      } satisfies HeroAction;
    })
    .filter((entry): entry is HeroAction => Boolean(entry));
}

function toCounterRows(
  stats: ProfileStats | undefined
): Array<{ key: string; label: string; value: number }> {
  if (!stats) return [];
  const rows = [
    { key: "follower_count", label: "Followers", value: stats.follower_count },
    { key: "following_count", label: "Following", value: stats.following_count },
    { key: "note_count", label: "Notes", value: stats.note_count },
    { key: "reply_count", label: "Replies", value: stats.reply_count },
  ];
  return rows.filter(
    (row): row is { key: string; label: string; value: number } => typeof row.value === "number"
  );
}

function fallbackIdentityDetails(
  profile: Profile | null,
  summary: Record<string, unknown> | null
): Array<{ key: string; label: string; value: MetadataPrimitiveValue }> {
  if (!profile) return [];
  const rows: Array<{ key: string; label: string; value: MetadataPrimitiveValue }> = [];
  const push = (key: string, label: string, raw: unknown, max = 56) => {
    if (typeof raw !== "string" || raw.trim().length === 0) return;
    const value = raw.trim();
    const display = value.length > max ? `${value.slice(0, max - 3)}...` : value;
    rows.push({
      key,
      label,
      value: { raw: value, display, copyable: true, truncated: display !== value },
    });
  };
  push("npub", "Npub", profile.npub);
  push("pubkey", "Pubkey", profile.pubkey);
  push("nip05", "NIP-05", profile.nip05);
  push("website", "Website", profile.website);
  push("lud16", "LUD-16", profile.lud16);
  push("about", "About", profile.about, 120);
  push("metadata_event_id", "Metadata event", summary?.metadata_event_id);
  return rows;
}

function activityEmptyMessage(tab: ProfileActivityTab): string {
  switch (tab) {
    case "notes":
      return "No recent notes were returned for this profile.";
    case "replies":
      return "No recent replies were returned for this profile.";
    case "reactions":
      return "No recent reactions were returned for this profile.";
    case "zaps":
      return "No recent zaps were returned for this profile.";
    case "long_form":
      return "No long-form articles were returned for this profile.";
    case "bookmarks":
      return "No bookmarks were returned for this profile.";
    case "highlights":
      return "No highlights were returned for this profile.";
    case "mute_list":
      return "This profile's mute list is empty or unavailable.";
    case "muted_by":
      return "No accounts muting this profile were returned.";
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pubkeyOrNpub } = await params;
  try {
    const summary = await getProfileSummaryCached(pubkeyOrNpub);
    const profile = summary.profile ?? (summary as unknown as Profile);
    const label =
      profile.display_name ?? profile.name ?? profile.npub ?? profile.pubkey ?? pubkeyOrNpub;
    return {
      title: label,
      description: `View profile activity, notes, and network context for ${label}.`,
    };
  } catch {
    return {
      title: `Profile ${pubkeyOrNpub}`,
      description: `View profile activity, notes, and network context for ${pubkeyOrNpub}.`,
    };
  }
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { pubkeyOrNpub } = await params;
  const resolvedSearchParams = await searchParams;
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
      summaryResult[0].reason instanceof Error
        ? summaryResult[0].reason.message
        : "Failed to load profile summary."
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
      profileResult.reason instanceof Error
        ? profileResult.reason.message
        : "Failed to enrich profile metadata."
    );
  }
  if (notesResult.status === "fulfilled") {
    authoredNotesPayload = notesResult.value;
  } else if (!isNotFoundReason(notesResult.reason)) {
    errors.push(
      notesResult.reason instanceof Error
        ? notesResult.reason.message
        : "Failed to load recent notes."
    );
  }
  if (repliesResult.status === "fulfilled") {
    authoredRepliesPayload = repliesResult.value;
  } else if (shouldLoadReplies && !isNotFoundReason(repliesResult.reason)) {
    errors.push(
      repliesResult.reason instanceof Error
        ? repliesResult.reason.message
        : "Failed to load recent replies."
    );
  }
  if (reactionsResult.status === "fulfilled") {
    authoredReactionsPayload = reactionsResult.value;
  } else if (shouldLoadReactions && !isNotFoundReason(reactionsResult.reason)) {
    errors.push(
      reactionsResult.reason instanceof Error
        ? reactionsResult.reason.message
        : "Failed to load recent reactions."
    );
  }
  if (zapsResult.status === "fulfilled") {
    authoredZapsPayload = zapsResult.value;
  } else if (shouldLoadZaps && !isNotFoundReason(zapsResult.reason)) {
    errors.push(
      zapsResult.reason instanceof Error ? zapsResult.reason.message : "Failed to load recent zaps."
    );
  }
  if (longFormResult.status === "fulfilled") {
    longFormPayload = longFormResult.value;
  } else if (shouldLoadLongForm && !isNotFoundReason(longFormResult.reason)) {
    errors.push(
      longFormResult.reason instanceof Error
        ? longFormResult.reason.message
        : "Failed to load long-form articles."
    );
  }
  if (bookmarksResult.status === "fulfilled") {
    bookmarksPayload = bookmarksResult.value;
  } else if (shouldLoadBookmarks && !isNotFoundReason(bookmarksResult.reason)) {
    errors.push(
      bookmarksResult.reason instanceof Error
        ? bookmarksResult.reason.message
        : "Failed to load bookmarks."
    );
  }
  if (highlightsResult.status === "fulfilled") {
    highlightsPayload = highlightsResult.value;
  } else if (shouldLoadHighlights && !isNotFoundReason(highlightsResult.reason)) {
    errors.push(
      highlightsResult.reason instanceof Error
        ? highlightsResult.reason.message
        : "Failed to load highlights."
    );
  }
  if (muteListResult.status === "fulfilled") {
    muteListPayload = muteListResult.value;
  } else if (shouldLoadMuteList && !isNotFoundReason(muteListResult.reason)) {
    errors.push(
      muteListResult.reason instanceof Error
        ? muteListResult.reason.message
        : "Failed to load mute list."
    );
  }
  if (mutedByResult.status === "fulfilled") {
    mutedByPayload = mutedByResult.value;
  } else if (shouldLoadMutedBy && !isNotFoundReason(mutedByResult.reason)) {
    errors.push(
      mutedByResult.reason instanceof Error
        ? mutedByResult.reason.message
        : "Failed to load muted-by accounts."
    );
  }
  if (relatedFallbackResult.status === "fulfilled") {
    relatedProfilesFallbackPayload = relatedFallbackResult.value;
  } else if (shouldLoadRelatedProfilesFallback && !isNotFoundReason(relatedFallbackResult.reason)) {
    errors.push(
      relatedFallbackResult.reason instanceof Error
        ? relatedFallbackResult.reason.message
        : "Failed to load related profiles."
    );
  }
  if (risingProfilesResult.status === "fulfilled") {
    risingProfilesPayload = risingProfilesResult.value;
  } else if (shouldLoadRisingProfilesFallback && !isNotFoundReason(risingProfilesResult.reason)) {
    errors.push(
      risingProfilesResult.reason instanceof Error
        ? risingProfilesResult.reason.message
        : "Failed to load rising profiles."
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

  const hero = isRecord(summaryRecord?.hero) ? summaryRecord.hero : null;
  const heroMetadata = isRecord(hero?.metadata) ? hero.metadata : null;
  const heroCounters = toCounterRows(
    (isRecord(hero?.counters) ? hero.counters : summary?.stats) as ProfileStats
  );
  const parsedHeroActions = normalizeHeroActions(hero?.actions);
  const heroActions =
    parsedHeroActions.length > 0
      ? parsedHeroActions
      : [
          {
            id: "recent_notes",
            label: "Recent notes",
            href: `${buildProfileActivityTabHref(profileRoute, currentSearchParams, "notes")}#profile-activity`,
          },
          {
            id: "related_profiles",
            label: "Related profiles",
            href: `${profileRoute}#related-profiles`,
          },
          { id: "rising_profiles", label: "Rising profiles", href: "/discovery/profiles/rising" },
        ];

  const heroNpubOrPubkey =
    asMetadataPrimitiveValue(heroMetadata?.npub_or_pubkey) ??
    (profile?.npub
      ? { raw: profile.npub, display: profile.npub, copyable: true, truncated: false }
      : profile?.pubkey
        ? {
            raw: profile.pubkey,
            display: truncateMiddle(profile.pubkey, 24),
            copyable: true,
            truncated: true,
          }
        : null);
  const heroWebsite = asMetadataPrimitiveValue(heroMetadata?.website) ?? null;
  const heroLud16 = asMetadataPrimitiveValue(heroMetadata?.lud16) ?? null;

  const identityDetailsFromSummary = (() => {
    const details = isRecord(summaryRecord?.identity_details)
      ? summaryRecord.identity_details
      : null;
    const fields = Array.isArray(details?.fields) ? details.fields : [];
    return fields
      .map((entry) => {
        if (!isRecord(entry)) return null;
        const key = typeof entry.key === "string" ? entry.key : "";
        const label = typeof entry.label === "string" ? entry.label : key;
        const value = asMetadataPrimitiveValue(entry.value);
        if (!label || !value) return null;
        return { key, label, value };
      })
      .filter((entry): entry is { key: string; label: string; value: MetadataPrimitiveValue } =>
        Boolean(entry)
      );
  })();
  const identityDetails =
    identityDetailsFromSummary.length > 0
      ? identityDetailsFromSummary
      : fallbackIdentityDetails(profile, summaryRecord);

  const heroDisplayName =
    (typeof hero?.display_name === "string" ? hero.display_name : undefined) ??
    profile?.display_name ??
    profile?.name ??
    (profile?.pubkey ? truncateMiddle(profile.pubkey, 24) : "Profile");
  const heroHandle =
    (typeof hero?.handle === "string" ? hero.handle : undefined) ??
    profile?.nip05 ??
    profile?.name ??
    undefined;
  const heroBio =
    (typeof hero?.bio === "string" ? hero.bio : undefined) ??
    (typeof profile?.about === "string" ? profile.about : undefined) ??
    "Explore public identity, activity, and discovery context for this profile.";
  const avatar =
    (typeof hero?.avatar === "string" ? hero.avatar : undefined) ??
    (profile ? profilePictureUrl(profile) : null) ??
    (profile
      ? profileFallbackAvatarDataUrl(profile)
      : profileFallbackAvatarDataUrl({ pubkey: lookupKey }));

  const notesAuthorMap =
    profile?.pubkey && profile.pubkey.length > 0
      ? { [profile.pubkey.toLowerCase()]: profile }
      : undefined;
  const activeTabMeta = PROFILE_ACTIVITY_TABS.find((tab) => tab.id === activityTab);
  const activeNextCursor = activityNextCursorByTab[activityTab];
  const activeContinuationHref = activityContinuationByTab[activityTab];
  const errorMessage = errors.length > 0 ? errors.join(" | ") : "";

  return (
    <div className="space-y-8">
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard title="Profile" description="Identity-first explorer surface for this account.">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Image
              src={avatar}
              alt={profile ? profileLabel(profile) : heroDisplayName}
              width={72}
              height={72}
              unoptimized
              className="border-edge-strong h-16 w-16 rounded-full border object-cover sm:h-[72px] sm:w-[72px]"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-ink truncate text-xl font-semibold tracking-tight">
                {heroDisplayName}
              </p>
              {heroHandle ? <p className="text-ink-muted truncate text-sm">{heroHandle}</p> : null}
              <p className="text-ink-dim text-sm leading-6">{heroBio}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            {heroNpubOrPubkey?.raw ? (
              <IdBadge
                id={heroNpubOrPubkey.raw}
                label={heroNpubOrPubkey.raw.startsWith("npub1") ? "npub" : "pubkey"}
              />
            ) : null}
            {heroWebsite?.raw ? (
              <Link
                href={heroWebsite.raw}
                className="border-edge-strong bg-surface/80 text-ink-dim hover:text-ink rounded-full border px-2 py-1"
              >
                {heroWebsite.display ?? truncateMiddle(heroWebsite.raw, 28)}
              </Link>
            ) : null}
            {heroLud16?.raw ? (
              <a
                href={`lightning:${heroLud16.raw}`}
                className="border-edge-strong bg-surface/80 text-ink-dim hover:text-ink rounded-full border px-2 py-1"
              >
                {heroLud16.display ?? heroLud16.raw}
              </a>
            ) : null}
          </div>

          {heroCounters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {heroCounters.map((counter) => (
                <div
                  key={counter.key}
                  className="border-edge-strong bg-surface/80 text-ink-dim rounded-full border px-3 py-1.5 text-xs"
                >
                  <span className="text-ink-faint mr-2">{counter.label}</span>
                  <span className="text-ink font-medium">{counter.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            {heroActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </SectionCard>

      <div id="profile-activity">
        <SectionCard
          title="Recent activity"
          description="Browse this profile's latest notes, replies, reactions, and zaps."
        >
          <div className="space-y-4">
            <ProfileActivityTabs activeTab={activityTab} tabs={activityTabs} />
            {activityTab === "notes" ? (
              notes.length > 0 ? (
                <NotesList notes={notes} authorsByPubkey={notesAuthorMap} />
              ) : (
                <EmptyState message={activityEmptyMessage("notes")} />
              )
            ) : null}
            {activityTab === "replies" ? (
              replies.length > 0 ? (
                <NotesList notes={replies} authorsByPubkey={notesAuthorMap} />
              ) : (
                <EmptyState message={activityEmptyMessage("replies")} />
              )
            ) : null}
            {activityTab === "reactions" ? (
              reactions.length > 0 ? (
                <ProfileReactionsActivityList
                  reactions={reactions}
                  targetNotesById={targetNotesById}
                  authorsByPubkey={{ ...notesAuthorMap, ...targetNoteAuthorsByPubkey }}
                />
              ) : (
                <EmptyState message={activityEmptyMessage("reactions")} />
              )
            ) : null}
            {activityTab === "zaps" ? (
              zaps.length > 0 ? (
                <ProfileZapsActivityList
                  zaps={zaps}
                  targetNotesById={targetNotesById}
                  authorsByPubkey={{ ...notesAuthorMap, ...targetNoteAuthorsByPubkey }}
                />
              ) : (
                <EmptyState message={activityEmptyMessage("zaps")} />
              )
            ) : null}
            {activityTab === "long_form" ? (
              longFormArticles.length > 0 ? (
                <ArticlesList
                  articles={longFormArticles}
                  authorsByPubkey={{ ...notesAuthorMap, ...eventListAuthorsByPubkey }}
                />
              ) : (
                <EmptyState message={activityEmptyMessage("long_form")} />
              )
            ) : null}
            {activityTab === "bookmarks" ? (
              bookmarks.length > 0 ? (
                <NotesList
                  notes={bookmarks}
                  authorsByPubkey={{ ...notesAuthorMap, ...eventListAuthorsByPubkey }}
                />
              ) : (
                <EmptyState message={activityEmptyMessage("bookmarks")} />
              )
            ) : null}
            {activityTab === "highlights" ? (
              highlights.length > 0 ? (
                <NotesList
                  notes={highlights}
                  authorsByPubkey={{ ...notesAuthorMap, ...eventListAuthorsByPubkey }}
                />
              ) : (
                <EmptyState message={activityEmptyMessage("highlights")} />
              )
            ) : null}
            {activityTab === "mute_list" ? (
              mutedProfiles.length > 0 ? (
                <ProfilesList profiles={mutedProfiles} />
              ) : (
                <EmptyState message={activityEmptyMessage("mute_list")} />
              )
            ) : null}
            {activityTab === "muted_by" ? (
              mutedByProfiles.length > 0 ? (
                <ProfilesList profiles={mutedByProfiles} />
              ) : (
                <EmptyState message={activityEmptyMessage("muted_by")} />
              )
            ) : null}
            {typeof activeNextCursor === "string" && activeNextCursor.length > 0 ? (
              <div className="border-accent/30 bg-accent/10 rounded-md border p-3">
                <p className="text-accent-ink text-xs">
                  More {activeTabMeta?.label.toLowerCase() ?? "activity"} are available.
                </p>
                <Link
                  href={activeContinuationHref}
                  className="border-accent/40 text-link-hover hover:text-accent-ink mt-2 inline-block rounded-full border px-3 py-1 text-xs"
                >
                  Continue {activeTabMeta?.label.toLowerCase() ?? "activity"}
                </Link>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <div id="related-profiles">
        <SectionCard
          title="Related discovery"
          description="Connected profiles and rising discovery surfaces related to this profile."
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-ink-muted text-xs font-medium">Related profiles</p>
              {relatedProfiles.length > 0 ? (
                <>
                  <ProfilesList profiles={relatedProfiles.slice(0, 8)} />
                  {typeof relatedProfilesNextCursor === "string" &&
                  relatedProfilesNextCursor.length > 0 ? (
                    <Link
                      href={relatedProfilesContinuationHref}
                      className="text-link inline-block text-sm"
                    >
                      Continue related profiles
                    </Link>
                  ) : null}
                </>
              ) : (
                <EmptyState message="No related profiles were returned for this profile yet." />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-ink-muted text-xs font-medium">Rising profiles</p>
              {risingProfiles.length > 0 ? (
                <ProfilesList profiles={risingProfiles.slice(0, 8)} />
              ) : (
                <EmptyState message="No rising profiles are available right now." />
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Identity details"
        description="Public metadata primitives with compact display and full-value access."
      >
        {identityDetails.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {identityDetails.map((field) => {
              const raw = field.value.raw ?? "";
              const display = field.value.display ?? raw;
              const isUrl = /^https?:\/\//i.test(raw);
              const isLud16 = field.key.toLowerCase() === "lud16";
              return (
                <li
                  key={`${field.key}-${field.label}`}
                  className="bg-surface-sunken/40 hover:bg-surface-sunken/60 rounded-lg p-3 transition-colors"
                >
                  <p className="text-ink-faint mb-1 text-[11px]">{field.label}</p>
                  {isUrl ? (
                    <Link href={raw} className="text-link hover:text-link-hover text-sm break-all">
                      {display}
                    </Link>
                  ) : isLud16 ? (
                    <a
                      href={`lightning:${raw}`}
                      className="text-link hover:text-link-hover text-sm break-all"
                    >
                      {display}
                    </a>
                  ) : (
                    <p className="text-ink-soft text-sm break-all" title={raw || display}>
                      {display}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState message="No lower-level identity details were returned for this profile." />
        )}
      </SectionCard>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: profile summary" data={summary ?? {}} />
        <DebugDisclosure title="Debug payload: profile enrichment" data={profileEnrichment ?? {}} />
        <DebugDisclosure title="Debug payload: authored notes" data={authoredNotesPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: authored replies"
          data={authoredRepliesPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: authored reactions"
          data={authoredReactionsPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: authored zaps" data={authoredZapsPayload ?? {}} />
        <DebugDisclosure title="Debug payload: long-form" data={longFormPayload ?? {}} />
        <DebugDisclosure title="Debug payload: bookmarks" data={bookmarksPayload ?? {}} />
        <DebugDisclosure title="Debug payload: highlights" data={highlightsPayload ?? {}} />
        <DebugDisclosure title="Debug payload: mute list" data={muteListPayload ?? {}} />
        <DebugDisclosure title="Debug payload: muted by" data={mutedByPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: related profiles fallback"
          data={relatedProfilesFallbackPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: rising profiles fallback"
          data={risingProfilesPayload ?? {}}
        />
      </div>
    </div>
  );
}
