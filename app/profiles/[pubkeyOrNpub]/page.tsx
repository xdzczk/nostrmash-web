import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { MetadataList } from "@/components/explorer/metadata-list";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { ProfileCard } from "@/components/explorer/profile-card";
import { StatCard } from "@/components/explorer/stat-card";
import { Timestamp } from "@/components/explorer/timestamp";
import { HashtagsList, NotesList, ProfilesList } from "@/components/data/renderers";
import {
  buildMetadataEntries,
  extractPrimitiveStats,
  isRecord,
  truncateMiddle,
} from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import {
  getAuthorActivityAnalytics,
  getAuthorEvents,
  getAuthorPostingBehaviorAnalytics,
  getAuthorReplies,
  getContactListContext,
  getProfile,
  getProfileFollowers,
  getProfileMentions,
  getProfileSummary,
  getProfileTopics,
  getRelatedProfiles,
  getRelayListContext,
  getTrustScore,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import type { Profile } from "@/lib/types/api";

type Params = Promise<{ pubkeyOrNpub: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const getProfileSummaryCached = cache(async (pubkeyOrNpub: string) =>
  getProfileSummary(pubkeyOrNpub, "requestTime")
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

function formatReason(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

function isNotFoundReason(reason: unknown): boolean {
  return reason instanceof Error && /API 404:/i.test(reason.message);
}

function dedupeByLabel<T>(
  items: Array<{ label: string; value: T }>
): Array<{ label: string; value: T }> {
  const seen = new Set<string>();
  const deduped: Array<{ label: string; value: T }> = [];
  for (const item of items) {
    const normalized = item.label.trim().toLowerCase();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(item);
  }
  return deduped;
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

function relayLabel(entry: unknown): string | null {
  if (typeof entry === "string" && entry.trim().length > 0) return entry.trim();
  if (!isRecord(entry)) return null;
  for (const key of ["relay_url", "url", "relay", "host", "name"]) {
    const value = entry[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function toAnalyticsStatCards(
  payload: unknown
): Array<{ label: string; value: string | number | boolean }> {
  if (!isRecord(payload)) return [];
  const records = [
    payload,
    isRecord(payload.analytics) ? payload.analytics : undefined,
    isRecord(payload.stats) ? payload.stats : undefined,
    isRecord(payload.summary) ? payload.summary : undefined,
  ].filter((entry): entry is Record<string, unknown> => Boolean(entry));
  const cards = dedupeByLabel(
    records
      .flatMap((entry) =>
        extractPrimitiveStats(entry, ["pubkey", "author_pubkey", "score", "trust_score"])
      )
      .filter((entry) => {
        const normalized = entry.label.toLowerCase();
        return /(count|ratio|rate|avg|average|median|percent|pct|score|volume|post|note|reply)/i.test(
          normalized
        );
      })
      .map((entry) => ({ label: entry.label, value: entry.value }))
  );
  return cards.slice(0, 8);
}

function toMetadataEntries(
  payload: unknown,
  excludeKeys: string[] = []
): Array<{ label: string; value: unknown }> {
  if (!isRecord(payload)) return [];
  return dedupeByLabel(extractPrimitiveStats(payload, excludeKeys).map((entry) => entry)).slice(
    0,
    12
  );
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
      description: `NostrMash profile explorer page for ${label}.`,
    };
  } catch {
    return {
      title: `Profile ${pubkeyOrNpub}`,
      description: `NostrMash profile explorer page for ${pubkeyOrNpub}.`,
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
  const followersCursor = readSearchParam(resolvedSearchParams, "followers_cursor");
  const mentionsCursor = readSearchParam(resolvedSearchParams, "mentions_cursor");
  const relatedProfilesCursor = readSearchParam(resolvedSearchParams, "related_profiles_cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const errors: string[] = [];

  let summary: Awaited<ReturnType<typeof getProfileSummary>> | null = null;
  let profileEnrichment: Awaited<ReturnType<typeof getProfile>> | null = null;
  let authoredEventsPayload: Awaited<ReturnType<typeof getAuthorEvents>> | null = null;
  let authoredRepliesPayload: Awaited<ReturnType<typeof getAuthorReplies>> | null = null;
  let followersPayload: Awaited<ReturnType<typeof getProfileFollowers>> | null = null;
  let mentionsPayload: Awaited<ReturnType<typeof getProfileMentions>> | null = null;
  let relatedProfilesPayload: Awaited<ReturnType<typeof getRelatedProfiles>> | null = null;
  let contactListPayload: Awaited<ReturnType<typeof getContactListContext>> | null = null;
  let relayListPayload: Awaited<ReturnType<typeof getRelayListContext>> | null = null;
  let profileTopicsPayload: Awaited<ReturnType<typeof getProfileTopics>> | null = null;
  let authorActivityAnalyticsPayload: Awaited<
    ReturnType<typeof getAuthorActivityAnalytics>
  > | null = null;
  let postingBehaviorAnalyticsPayload: Awaited<
    ReturnType<typeof getAuthorPostingBehaviorAnalytics>
  > | null = null;
  let trustScorePayload: Awaited<ReturnType<typeof getTrustScore>> | null = null;

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

  const summaryProfile = summary ? (summary.profile ?? (summary as unknown as Profile)) : null;
  const lookupKey = summaryProfile?.pubkey ?? summary?.pubkey ?? pubkeyOrNpub;
  const shouldEnrichProfile = !hasIdentityMetadata(summaryProfile);

  const [
    profileResult,
    authoredEventsResult,
    authoredRepliesResult,
    followersResult,
    mentionsResult,
    relatedProfilesResult,
    contactListResult,
    relayListResult,
    profileTopicsResult,
    authorActivityAnalyticsResult,
    postingBehaviorAnalyticsResult,
    trustScoreResult,
  ] = await Promise.allSettled([
    shouldEnrichProfile ? getProfile(lookupKey, "requestTime") : Promise.resolve(null),
    getAuthorEvents(lookupKey, "requestTime", { cursor: notesCursor }),
    getAuthorReplies(lookupKey, "requestTime", { cursor: repliesCursor }),
    getProfileFollowers(lookupKey, "requestTime", { cursor: followersCursor }),
    getProfileMentions(lookupKey, "requestTime", { cursor: mentionsCursor }),
    getRelatedProfiles(lookupKey, "requestTime", { cursor: relatedProfilesCursor }),
    getContactListContext(lookupKey, "requestTime"),
    getRelayListContext(lookupKey, "requestTime"),
    getProfileTopics(lookupKey, "requestTime"),
    getAuthorActivityAnalytics(lookupKey, "requestTime"),
    getAuthorPostingBehaviorAnalytics(lookupKey, "requestTime"),
    getTrustScore(lookupKey, "requestTime"),
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

  if (authoredEventsResult.status === "fulfilled") {
    authoredEventsPayload = authoredEventsResult.value;
  } else {
    errors.push(
      authoredEventsResult.reason instanceof Error
        ? authoredEventsResult.reason.message
        : "Failed to load authored notes."
    );
  }

  if (authoredRepliesResult.status === "fulfilled") {
    authoredRepliesPayload = authoredRepliesResult.value;
  } else {
    errors.push(formatReason(authoredRepliesResult.reason, "Failed to load authored replies."));
  }

  if (followersResult.status === "fulfilled") {
    followersPayload = followersResult.value;
  } else if (!isNotFoundReason(followersResult.reason)) {
    errors.push(formatReason(followersResult.reason, "Failed to load followers context."));
  }

  if (mentionsResult.status === "fulfilled") {
    mentionsPayload = mentionsResult.value;
  } else if (!isNotFoundReason(mentionsResult.reason)) {
    errors.push(formatReason(mentionsResult.reason, "Failed to load mentions context."));
  }

  if (relatedProfilesResult.status === "fulfilled") {
    relatedProfilesPayload = relatedProfilesResult.value;
  } else if (!isNotFoundReason(relatedProfilesResult.reason)) {
    errors.push(
      formatReason(relatedProfilesResult.reason, "Failed to load related profiles context.")
    );
  }

  if (contactListResult.status === "fulfilled") {
    contactListPayload = contactListResult.value;
  } else if (!isNotFoundReason(contactListResult.reason)) {
    errors.push(formatReason(contactListResult.reason, "Failed to load contact list context."));
  }

  if (relayListResult.status === "fulfilled") {
    relayListPayload = relayListResult.value;
  } else if (!isNotFoundReason(relayListResult.reason)) {
    errors.push(formatReason(relayListResult.reason, "Failed to load relay list context."));
  }

  if (profileTopicsResult.status === "fulfilled") {
    profileTopicsPayload = profileTopicsResult.value;
  } else if (!isNotFoundReason(profileTopicsResult.reason)) {
    errors.push(formatReason(profileTopicsResult.reason, "Failed to load topic interest context."));
  }

  if (authorActivityAnalyticsResult.status === "fulfilled") {
    authorActivityAnalyticsPayload = authorActivityAnalyticsResult.value;
  } else if (!isNotFoundReason(authorActivityAnalyticsResult.reason)) {
    errors.push(
      formatReason(
        authorActivityAnalyticsResult.reason,
        "Failed to load author activity analytics."
      )
    );
  }

  if (postingBehaviorAnalyticsResult.status === "fulfilled") {
    postingBehaviorAnalyticsPayload = postingBehaviorAnalyticsResult.value;
  } else if (!isNotFoundReason(postingBehaviorAnalyticsResult.reason)) {
    errors.push(
      formatReason(
        postingBehaviorAnalyticsResult.reason,
        "Failed to load posting and reply behavior analytics."
      )
    );
  }

  if (trustScoreResult.status === "fulfilled") {
    trustScorePayload = trustScoreResult.value;
  } else if (!isNotFoundReason(trustScoreResult.reason)) {
    errors.push(formatReason(trustScoreResult.reason, "Failed to load trust score metadata."));
  }

  const profile = mergeProfile(summaryProfile, profileEnrichment);
  const semantics = extractNativeApiSemantics(
    summary,
    authoredEventsPayload,
    authoredRepliesPayload,
    profileEnrichment
  );
  const notes = authoredEventsPayload?.events ?? [];
  const replies = authoredRepliesPayload?.replies ?? [];
  const followers = followersPayload?.followers ?? [];
  const mentions = mentionsPayload?.mentions ?? [];
  const relatedProfiles = relatedProfilesPayload?.related_profiles ?? [];
  const contactProfiles = contactListPayload?.contacts ?? [];
  const contactRelayHints = (contactListPayload?.relays ?? [])
    .map((entry) => relayLabel(entry))
    .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  const relayEntries = relayListPayload?.relays ?? [];
  const interestTopics = profileTopicsPayload?.topics ?? [];
  const interestProfiles = profileTopicsPayload?.profiles ?? [];
  const notesNextCursor = extractNativeApiSemantics(authoredEventsPayload).next_cursor;
  const repliesNextCursor = extractNativeApiSemantics(authoredRepliesPayload).next_cursor;
  const followersNextCursor = extractNativeApiSemantics(followersPayload).next_cursor;
  const mentionsNextCursor = extractNativeApiSemantics(mentionsPayload).next_cursor;
  const relatedProfilesNextCursor = extractNativeApiSemantics(relatedProfilesPayload).next_cursor;
  const notesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "notes_cursor",
    notesNextCursor
  );
  const repliesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "replies_cursor",
    repliesNextCursor
  );
  const followersContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "followers_cursor",
    followersNextCursor
  );
  const mentionsContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "mentions_cursor",
    mentionsNextCursor
  );
  const relatedProfilesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "related_profiles_cursor",
    relatedProfilesNextCursor
  );

  const counters = dedupeByLabel(
    extractPrimitiveStats(
      {
        ...(isRecord(summary?.stats) ? summary.stats : {}),
        note_count:
          summary?.note_count ?? (isRecord(summary?.stats) ? summary.stats.note_count : undefined),
        reply_count:
          summary?.reply_count ??
          (isRecord(summary?.stats) ? summary.stats.reply_count : undefined),
        follower_count:
          summary?.follower_count ??
          (isRecord(summary?.stats) ? summary.stats.follower_count : undefined),
        following_count:
          summary?.following_count ??
          (isRecord(summary?.stats) ? summary.stats.following_count : undefined),
        relay_count:
          summary?.relay_count ??
          (isRecord(summary?.stats) ? summary.stats.relay_count : undefined),
      },
      []
    ).filter((entry) =>
      /(follower|following|note_count|reply_count|relay_count|count)/i.test(entry.label)
    )
  ).slice(0, 8);

  const trustScoreFromSummary = extractPrimitiveStats(
    {
      ...(isRecord(summary) ? summary : {}),
      ...(isRecord(summary?.stats) ? summary.stats : {}),
    },
    []
  ).find((entry) => /trust.*score|trust_score|trustscore/i.test(entry.label));
  const trustScoreValue =
    (typeof trustScorePayload?.trust_score === "number" ||
    typeof trustScorePayload?.trust_score === "string"
      ? trustScorePayload.trust_score
      : undefined) ??
    (typeof trustScorePayload?.score === "number" || typeof trustScorePayload?.score === "string"
      ? trustScorePayload.score
      : undefined) ??
    trustScoreFromSummary?.value;
  const trustMetadata = dedupeByLabel(
    [
      ...toMetadataEntries(trustScorePayload, [
        "pubkey",
        "author_pubkey",
        "trust_score",
        "score",
        "metadata",
      ]),
      ...toMetadataEntries(
        isRecord(trustScorePayload?.metadata) ? trustScorePayload.metadata : undefined,
        ["trust_score", "score"]
      ),
    ].filter((entry) => entry.value !== undefined && entry.value !== null)
  ).slice(0, 12);
  const authorActivityStatCards = toAnalyticsStatCards(authorActivityAnalyticsPayload);
  const postingBehaviorStatCards = toAnalyticsStatCards(postingBehaviorAnalyticsPayload);
  const authorActivityMetadata = toMetadataEntries(authorActivityAnalyticsPayload, [
    "pubkey",
    "author_pubkey",
    "analytics",
    "stats",
    "summary",
    "meta",
  ]);
  const postingBehaviorMetadata = toMetadataEntries(postingBehaviorAnalyticsPayload, [
    "pubkey",
    "author_pubkey",
    "analytics",
    "stats",
    "summary",
    "meta",
  ]);

  const details = profile
    ? buildMetadataEntries(profile as Record<string, unknown>, [
        "pubkey",
        "npub",
        "name",
        "display_name",
        "website",
        "nip05",
        "lud16",
      ])
    : [];
  const profileTimestamps = profile
    ? buildMetadataEntries(profile as Record<string, unknown>, [
        "created_at",
        "updated_at",
        "last_seen",
      ])
    : [];
  const publicSummaryMetadata = summary
    ? dedupeByLabel(
        [
          ...buildMetadataEntries(
            {
              consistency: semantics.consistency,
              trust_mode: semantics.trust_mode,
              trust_applied: semantics.trust_applied,
              result_scope:
                typeof semantics.result_scope === "object" && semantics.result_scope
                  ? JSON.stringify(semantics.result_scope)
                  : semantics.result_scope,
            },
            ["consistency", "trust_mode", "trust_applied", "result_scope"]
          ),
          ...extractPrimitiveStats(summary, [
            "pubkey",
            "profile",
            "stats",
            "npub",
            "name",
            "display_name",
            "about",
            "picture",
            "website",
            "nip05",
            "lud16",
            "note_count",
            "reply_count",
            "follower_count",
            "following_count",
            "relay_count",
          ]).map((entry) => ({ label: entry.label, value: entry.value })),
        ].filter(
          (entry) =>
            entry.value !== undefined && entry.value !== null && String(entry.value).length > 0
        )
      ).slice(0, 12)
    : [];
  const headerTitle =
    profile?.display_name ??
    profile?.name ??
    profile?.npub ??
    (profile?.pubkey ? truncateMiddle(profile.pubkey, 24) : "Profile explorer");
  const errorMessage = errors.length > 0 ? errors.join(" | ") : "";
  const dedupeProfiles = (profiles: Profile[]): Profile[] =>
    Array.from(
      new Map(
        profiles.map((entry, index) => {
          const pubkey =
            typeof entry.pubkey === "string" && entry.pubkey.length > 0
              ? entry.pubkey.toLowerCase()
              : null;
          const npub =
            typeof entry.npub === "string" && entry.npub.length > 0
              ? entry.npub.toLowerCase()
              : null;
          return [pubkey ?? npub ?? `profile-${index}`, entry] as const;
        })
      ).values()
    );
  const dedupeStrings = (values: string[]): string[] =>
    Array.from(new Map(values.map((value) => [value.toLowerCase(), value] as const)).values());
  const uniqueFollowers = dedupeProfiles(followers).slice(0, 8);
  const uniqueMentions = dedupeProfiles(mentions).slice(0, 8);
  const uniqueRelatedProfiles = dedupeProfiles(relatedProfiles).slice(0, 8);
  const uniqueContactProfiles = dedupeProfiles(contactProfiles).slice(0, 8);
  const uniqueInterestProfiles = dedupeProfiles(interestProfiles).slice(0, 8);
  const uniqueContactRelays = dedupeStrings(contactRelayHints).slice(0, 8);
  const contactListScopeMetadata = dedupeByLabel(
    extractPrimitiveStats(contactListPayload, [
      "contacts",
      "relays",
      "contact_pubkeys",
      "meta",
    ]).map((entry) => ({
      label: entry.label,
      value: entry.value,
    }))
  ).slice(0, 6);
  const relayListScopeMetadata = dedupeByLabel(
    extractPrimitiveStats(relayListPayload, ["relays", "meta"]).map((entry) => ({
      label: entry.label,
      value: entry.value,
    }))
  ).slice(0, 6);
  const notesAuthorMap =
    profile?.pubkey && profile.pubkey.length > 0
      ? { [profile.pubkey.toLowerCase()]: profile }
      : undefined;
  const firstAuthoredNoteId = typeof notes[0]?.id === "string" ? notes[0].id : undefined;

  return (
    <div className="space-y-8">
      <PageHero
        title={headerTitle}
        subtitle={
          profile?.about ??
          "Inspect identity, counters, and authored activity from NostrMash profile explorer."
        }
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            {profile?.pubkey ? <IdBadge id={profile.pubkey} label="pubkey" /> : null}
            {profile?.npub ? <IdBadge id={profile.npub} label="npub" /> : null}
            <Timestamp
              unixSeconds={
                typeof profile?.last_seen === "number"
                  ? profile.last_seen
                  : typeof summary?.recent_activity_at === "number"
                    ? summary.recent_activity_at
                    : undefined
              }
            />
          </div>
        }
      />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard
        title="Discovery loops"
        description="Jump from this profile into momentum views, then back into note and profile detail."
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/discovery/profiles/rising"
            className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:text-zinc-100"
          >
            Open rising profiles
          </Link>
          <Link
            href="/discovery/conversations/hot"
            className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:text-zinc-100"
          >
            Open hot conversations
          </Link>
          {firstAuthoredNoteId ? (
            <Link
              href={`/notes/${encodeURIComponent(firstAuthoredNoteId)}`}
              className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:text-zinc-100"
            >
              Open latest authored note
            </Link>
          ) : null}
        </div>
      </SectionCard>

      {profile ? (
        <SectionCard title="Profile header" description="Primary identity and profile card.">
          <ProfileCard profile={profile} summary={isRecord(summary) ? summary : undefined} />
        </SectionCard>
      ) : null}

      {counters.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Counters</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {counters.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ) : null}

      {authorActivityStatCards.length > 0 || authorActivityMetadata.length > 0 ? (
        <SectionCard
          title="Author activity analytics"
          description="Backend-provided author analytics. Explorer presents returned fields without deriving extra formulas."
        >
          {authorActivityStatCards.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {authorActivityStatCards.map((stat) => (
                <StatCard key={stat.label} label={stat.label} value={stat.value} />
              ))}
            </div>
          ) : null}
          {authorActivityMetadata.length > 0 ? (
            <div className={authorActivityStatCards.length > 0 ? "mt-4" : undefined}>
              <MetadataList items={authorActivityMetadata} columns={2} />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {postingBehaviorStatCards.length > 0 || postingBehaviorMetadata.length > 0 ? (
        <SectionCard
          title="Posting and reply behavior"
          description="Backend-provided posting/reply behavior fields when available. Explorer only formats values for readability."
        >
          {postingBehaviorStatCards.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {postingBehaviorStatCards.map((stat) => (
                <StatCard key={stat.label} label={stat.label} value={stat.value} />
              ))}
            </div>
          ) : null}
          {postingBehaviorMetadata.length > 0 ? (
            <div className={postingBehaviorStatCards.length > 0 ? "mt-4" : undefined}>
              <MetadataList items={postingBehaviorMetadata} columns={2} />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {trustScoreValue !== undefined || trustMetadata.length > 0 ? (
        <SectionCard
          title="Trust signals"
          description="Trust score and metadata from backend trust endpoints. Explorer presentation: only labels and layout."
        >
          {trustScoreValue !== undefined ? (
            <div className="grid gap-3 sm:max-w-sm">
              <StatCard
                label={
                  typeof trustScoreFromSummary?.label === "string"
                    ? trustScoreFromSummary.label
                    : "trust_score"
                }
                value={trustScoreValue}
              />
            </div>
          ) : null}
          {trustMetadata.length > 0 ? (
            <div className={trustScoreValue !== undefined ? "mt-4" : undefined}>
              <MetadataList items={trustMetadata} columns={2} />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {details.length > 0 ? (
        <SectionCard
          title="Identity metadata"
          description="Identifiers and public profile metadata fields."
        >
          <MetadataList items={details} columns={2} />
        </SectionCard>
      ) : null}

      {profileTimestamps.length > 0 ? (
        <SectionCard title="Freshness" description="Any timestamp fields returned by the backend.">
          <MetadataList items={profileTimestamps} columns={2} />
        </SectionCard>
      ) : null}

      <div id="authored-notes">
        {notes.length > 0 ? (
          <SectionCard title="Authored notes" description="Latest notes authored by this profile.">
            <NotesList notes={notes} authorsByPubkey={notesAuthorMap} />
            {typeof notesNextCursor === "string" && notesNextCursor.length > 0 ? (
              <div className="mt-4 rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3">
                <p className="text-xs text-indigo-100">
                  More authored notes are available from the continuation cursor.
                </p>
                <Link
                  href={notesContinuationHref}
                  className="mt-2 inline-block rounded-full border border-indigo-500/40 px-3 py-1 text-xs text-indigo-200 hover:text-indigo-100"
                >
                  Continue notes
                </Link>
              </div>
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard title="Authored notes" description="Latest notes authored by this profile.">
            <EmptyState message="No authored notes were returned for this profile." />
          </SectionCard>
        )}
      </div>

      {replies.length > 0 ? (
        <SectionCard
          title="Authored replies"
          description="Latest replies authored by this profile."
        >
          <NotesList notes={replies} authorsByPubkey={notesAuthorMap} />
          {typeof repliesNextCursor === "string" && repliesNextCursor.length > 0 ? (
            <div className="mt-4 rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3">
              <p className="text-xs text-indigo-100">
                More authored replies are available from the continuation cursor.
              </p>
              <Link
                href={repliesContinuationHref}
                className="mt-2 inline-block rounded-full border border-indigo-500/40 px-3 py-1 text-xs text-indigo-200 hover:text-indigo-100"
              >
                Continue replies
              </Link>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {replies.length === 0 ? (
        <SectionCard
          title="Authored replies"
          description="Latest replies authored by this profile."
        >
          <EmptyState message="No authored replies were returned for this profile." />
        </SectionCard>
      ) : null}

      <SectionCard
        title="Followers"
        description="Profiles currently connected to this account through follow relationships."
      >
        {uniqueFollowers.length > 0 ? (
          <>
            <ProfilesList profiles={uniqueFollowers} />
            {typeof followersNextCursor === "string" && followersNextCursor.length > 0 ? (
              <Link
                href={followersContinuationHref}
                className="mt-3 inline-block text-sm text-indigo-300"
              >
                Continue followers
              </Link>
            ) : null}
          </>
        ) : (
          <EmptyState message="No follower relationships were returned for this profile window." />
        )}
      </SectionCard>

      <SectionCard
        title="Mentions"
        description="Profiles that mention or frequently intersect with this identity."
      >
        {uniqueMentions.length > 0 ? (
          <>
            <ProfilesList profiles={uniqueMentions} />
            {typeof mentionsNextCursor === "string" && mentionsNextCursor.length > 0 ? (
              <Link
                href={mentionsContinuationHref}
                className="mt-3 inline-block text-sm text-indigo-300"
              >
                Continue mentions
              </Link>
            ) : null}
          </>
        ) : (
          <EmptyState message="No mention relationships were returned for this profile window." />
        )}
      </SectionCard>

      <div id="related-profiles">
        <SectionCard
          title="Related profiles"
          description="Profiles identified as graph-adjacent or behaviorally related."
        >
          {uniqueRelatedProfiles.length > 0 ? (
            <>
              <ProfilesList profiles={uniqueRelatedProfiles} />
              {typeof relatedProfilesNextCursor === "string" &&
              relatedProfilesNextCursor.length > 0 ? (
                <Link
                  href={relatedProfilesContinuationHref}
                  className="mt-3 inline-block text-sm text-indigo-300"
                >
                  Continue related profiles
                </Link>
              ) : null}
            </>
          ) : (
            <EmptyState message="No related profiles were returned for this account yet." />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Contact list context"
        description="Public contact-list relationships and relay hints attached to this profile."
      >
        {uniqueContactProfiles.length > 0 ? (
          <ProfilesList profiles={uniqueContactProfiles} />
        ) : null}
        {uniqueContactRelays.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {uniqueContactRelays.map((relay) => (
              <Link
                key={relay}
                href={`/relays/${encodeURIComponent(relay)}`}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:text-zinc-100"
              >
                {relay}
              </Link>
            ))}
          </div>
        ) : null}
        {contactListScopeMetadata.length > 0 ? (
          <div className="mt-4">
            <MetadataList items={contactListScopeMetadata} columns={2} />
          </div>
        ) : null}
        {uniqueContactProfiles.length === 0 &&
        uniqueContactRelays.length === 0 &&
        contactListScopeMetadata.length === 0 ? (
          <EmptyState message="No contact-list context was available for this profile." />
        ) : null}
      </SectionCard>

      <SectionCard
        title="Relay list context"
        description="Relays this profile advertises and where to continue graph exploration."
      >
        {relayEntries.length > 0 ? (
          <ul className="space-y-2">
            {relayEntries.slice(0, 12).map((relayEntry, index) => {
              const relay = relayLabel(relayEntry);
              if (!relay) return null;
              const readFlag = typeof relayEntry.read === "boolean" ? relayEntry.read : undefined;
              const writeFlag =
                typeof relayEntry.write === "boolean" ? relayEntry.write : undefined;
              return (
                <li
                  key={`${relay}-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/45 px-3 py-2 text-xs"
                >
                  <Link
                    href={`/relays/${encodeURIComponent(relay)}`}
                    className="text-indigo-300 hover:text-indigo-200"
                  >
                    {relay}
                  </Link>
                  {readFlag !== undefined ? (
                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">
                      read: {readFlag ? "yes" : "no"}
                    </span>
                  ) : null}
                  {writeFlag !== undefined ? (
                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">
                      write: {writeFlag ? "yes" : "no"}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {relayListScopeMetadata.length > 0 ? (
          <div className="mt-4">
            <MetadataList items={relayListScopeMetadata} columns={2} />
          </div>
        ) : null}
        {relayEntries.length === 0 && relayListScopeMetadata.length === 0 ? (
          <EmptyState message="No relay-list context was available for this profile." />
        ) : null}
      </SectionCard>

      <SectionCard
        title="Topic and interest context"
        description="Hashtag topics and profile-level interests linked to this identity."
      >
        {interestTopics.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Topics</p>
            <HashtagsList hashtags={interestTopics.slice(0, 12)} searchable />
          </div>
        ) : null}
        {uniqueInterestProfiles.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              Related interest profiles
            </p>
            <ProfilesList profiles={uniqueInterestProfiles} />
          </div>
        ) : null}
        {interestTopics.length === 0 && uniqueInterestProfiles.length === 0 ? (
          <EmptyState message="No topic or profile-interest context was available for this profile." />
        ) : null}
      </SectionCard>

      {publicSummaryMetadata.length > 0 ? (
        <SectionCard
          title="Public summary metadata"
          description="Non-identity fields from summary payload."
        >
          <MetadataList items={publicSummaryMetadata} columns={2} />
        </SectionCard>
      ) : null}

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: profile summary" data={summary ?? {}} />
        <DebugDisclosure title="Debug payload: profile enrichment" data={profileEnrichment ?? {}} />
        <DebugDisclosure title="Debug payload: authored notes" data={authoredEventsPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: authored replies"
          data={authoredRepliesPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: followers" data={followersPayload ?? {}} />
        <DebugDisclosure title="Debug payload: mentions" data={mentionsPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: related profiles"
          data={relatedProfilesPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: contact list" data={contactListPayload ?? {}} />
        <DebugDisclosure title="Debug payload: relay list" data={relayListPayload ?? {}} />
        <DebugDisclosure title="Debug payload: profile topics" data={profileTopicsPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: author activity analytics"
          data={authorActivityAnalyticsPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: posting behavior analytics"
          data={postingBehaviorAnalyticsPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: trust score" data={trustScorePayload ?? {}} />
      </div>
    </div>
  );
}
