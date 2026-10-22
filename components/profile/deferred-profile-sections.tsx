import Link from "next/link";
import type { ReactNode } from "react";

import { ArticlesList, NotesList, ProfilesList } from "@/components/data/renderers";
import { ProfileRelatedRail } from "@/components/profile/profile-related-rail";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { isRecord } from "@/components/explorer/utils";
import { mapRelatedProfileReasons } from "@/components/explorer/why-now";
import { ProfileActivityTabs } from "@/components/profile/profile-activity-tabs";
import {
  ProfileReactionsActivityList,
  ProfileZapsActivityList,
} from "@/components/profile/profile-engagement-activity-list";
import { ProfileHighlightsList } from "@/components/profile/profile-highlights-list";
import { ProfileRepliesList } from "@/components/profile/profile-replies-list";
import { Pill } from "@/components/ui/pill";
import { SectionCard } from "@/components/ui/section-card";
import { activityEmptyCopy, suggestActivityTab } from "@/lib/profile/activity-empty-state";
import { PROFILE_ACTIVITY_TABS, type ProfileActivityTab } from "@/lib/profile/activity-tabs";
import {
  loadProfileActivityData,
  loadProfileDiscoveryData,
} from "@/lib/profile/load-profile-page-data";
import type { Profile, ProfileStats } from "@/lib/types/api";

function ActivityEmpty({
  tab,
  tabs,
  stats,
}: {
  tab: ProfileActivityTab;
  tabs: Array<{ id: ProfileActivityTab; href: string }>;
  stats: Pick<ProfileStats, "note_count" | "reply_count"> | null;
}) {
  const copy = activityEmptyCopy(tab);
  const suggested = suggestActivityTab(tab, stats);
  const target = suggested ? tabs.find((entry) => entry.id === suggested) : undefined;
  const targetLabel = PROFILE_ACTIVITY_TABS.find((entry) => entry.id === suggested)?.label;
  return (
    <EmptyState
      message={copy.message}
      hint={copy.hint}
      actions={
        target && targetLabel ? (
          <Link
            href={target.href}
            className="nm-pressable border-edge-strong text-ink-soft hover:bg-surface-hover inline-flex min-h-9 items-center rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            View {targetLabel.toLowerCase()}
          </Link>
        ) : undefined
      }
    />
  );
}

function readSummaryStats(
  summaryRecord: Record<string, unknown> | null
): Pick<ProfileStats, "note_count" | "reply_count"> | null {
  const stats = isRecord(summaryRecord?.stats) ? summaryRecord.stats : null;
  if (!stats) return null;
  return {
    note_count: typeof stats.note_count === "number" ? stats.note_count : undefined,
    reply_count: typeof stats.reply_count === "number" ? stats.reply_count : undefined,
  };
}

export async function DeferredProfileActivity({
  lookupKey,
  profile,
  profileRoute,
  summaryRecord,
  searchParams,
}: {
  lookupKey: string;
  profile: Profile | null;
  profileRoute: string;
  summaryRecord: Record<string, unknown> | null;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const data = await loadProfileActivityData(
    { lookupKey, profile, profileRoute, summaryRecord },
    searchParams
  );
  const stats = readSummaryStats(summaryRecord);
  const empty = (tab: ProfileActivityTab) => (
    <ActivityEmpty tab={tab} tabs={data.activityTabs} stats={stats} />
  );

  let panel: ReactNode = null;
  switch (data.activityTab) {
    case "notes":
      panel =
        data.notes.length > 0 ? (
          <NotesList
            notes={data.notes}
            authorsByPubkey={data.notesAuthorMap}
            showAuthor={false}
            showUtilityLinks={false}
            omitZeroStats
            compactMedia
          />
        ) : (
          empty("notes")
        );
      break;
    case "replies":
      panel =
        data.replies.length > 0 ? (
          <ProfileRepliesList
            replies={data.replies}
            parentsById={data.replyParentsById}
            authorsByPubkey={data.notesAuthorMap}
          />
        ) : (
          empty("replies")
        );
      break;
    case "reactions":
      panel =
        data.reactions.length > 0 ? (
          <ProfileReactionsActivityList
            reactions={data.reactions}
            targetNotesById={data.targetNotesById}
            authorsByPubkey={{ ...data.notesAuthorMap, ...data.targetNoteAuthorsByPubkey }}
          />
        ) : (
          empty("reactions")
        );
      break;
    case "zaps":
      panel =
        data.zaps.length > 0 ? (
          <ProfileZapsActivityList
            zaps={data.zaps}
            targetNotesById={data.targetNotesById}
            authorsByPubkey={{ ...data.notesAuthorMap, ...data.targetNoteAuthorsByPubkey }}
          />
        ) : (
          empty("zaps")
        );
      break;
    case "long_form":
      panel =
        data.longFormArticles.length > 0 ? (
          <ArticlesList
            articles={data.longFormArticles}
            authorsByPubkey={{ ...data.notesAuthorMap, ...data.eventListAuthorsByPubkey }}
            showAuthor={false}
            showUtilityLinks={false}
            omitZeroStats
          />
        ) : (
          empty("long_form")
        );
      break;
    case "bookmarks":
      panel =
        data.bookmarks.length > 0 ? (
          <NotesList
            notes={data.bookmarks}
            authorsByPubkey={{ ...data.notesAuthorMap, ...data.eventListAuthorsByPubkey }}
            showUtilityLinks={false}
            omitZeroStats
            compactMedia
          />
        ) : (
          empty("bookmarks")
        );
      break;
    case "highlights":
      panel =
        data.highlights.length > 0 ? (
          <ProfileHighlightsList highlights={data.highlights} />
        ) : (
          empty("highlights")
        );
      break;
    case "mute_list":
      panel =
        data.mutedProfiles.length > 0 ? (
          <ProfilesList profiles={data.mutedProfiles} />
        ) : (
          empty("mute_list")
        );
      break;
    case "muted_by":
      panel =
        data.mutedByProfiles.length > 0 ? (
          <ProfilesList profiles={data.mutedByProfiles} />
        ) : (
          empty("muted_by")
        );
      break;
  }

  return (
    <div id="profile-activity">
      <SectionCard title="Recent activity">
        <div className="space-y-4">
          <ProfileActivityTabs activeTab={data.activityTab} tabs={data.activityTabs}>
            <div className="space-y-4">
              {panel}
              {typeof data.activeNextCursor === "string" && data.activeNextCursor.length > 0 ? (
                <div className="border-accent/30 bg-accent/10 rounded-md border p-3">
                  <p className="text-accent-ink text-xs">
                    More {data.activeTabMeta?.label.toLowerCase() ?? "activity"} are available.
                  </p>
                  <Link
                    href={data.activeContinuationHref}
                    className="border-accent/40 text-link-hover hover:text-accent-ink mt-2 inline-block rounded-full border px-3 py-1 text-xs"
                  >
                    Continue {data.activeTabMeta?.label.toLowerCase() ?? "activity"}
                  </Link>
                </div>
              ) : null}
            </div>
          </ProfileActivityTabs>
        </div>
      </SectionCard>

      <div className="mt-3 space-y-3">
        <DebugDisclosure
          title="Debug payload: authored notes"
          data={data.authoredNotesPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: authored replies"
          data={data.authoredRepliesPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: authored reactions"
          data={data.authoredReactionsPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: authored zaps"
          data={data.authoredZapsPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: long-form" data={data.longFormPayload ?? {}} />
        <DebugDisclosure title="Debug payload: bookmarks" data={data.bookmarksPayload ?? {}} />
        <DebugDisclosure title="Debug payload: highlights" data={data.highlightsPayload ?? {}} />
        <DebugDisclosure title="Debug payload: mute list" data={data.muteListPayload ?? {}} />
        <DebugDisclosure title="Debug payload: muted by" data={data.mutedByPayload ?? {}} />
      </div>
    </div>
  );
}

export async function DeferredProfileDiscovery({
  lookupKey,
  profileRoute,
  summaryRecord,
  searchParams,
}: {
  lookupKey: string;
  profileRoute: string;
  summaryRecord: Record<string, unknown> | null;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const data = await loadProfileDiscoveryData(
    { lookupKey, summaryRecord, profileRoute },
    searchParams
  );
  const isFallback = data.relatedSource === "trending-fallback";
  const relatedPeople = isFallback
    ? data.relatedProfiles
    : data.relatedProfiles.filter((profile) => mapRelatedProfileReasons(profile).length > 0);
  const hasProfiles = relatedPeople.length > 0;

  return (
    <div id="related-profiles">
      <SectionCard
        title="Related discovery"
        description={
          isFallback
            ? "Related profiles are unavailable right now; showing trending profiles instead."
            : "Profiles this account interacts with most, ranked by replies, reposts, and shared topics."
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-ink-muted text-xs font-medium">
              {isFallback ? "Trending profiles" : "Related profiles"}
            </p>
            {isFallback ? (
              <Pill
                tone="neutral"
                title={
                  data.relatedDegradedReason
                    ? `Upstream reason: ${data.relatedDegradedReason}`
                    : undefined
                }
              >
                Fallback
              </Pill>
            ) : null}
          </div>
          {hasProfiles ? (
            <>
              <ProfileRelatedRail profiles={relatedPeople} allowWithoutReason={isFallback} />
              {typeof data.relatedProfilesNextCursor === "string" &&
              data.relatedProfilesNextCursor.length > 0 ? (
                <Link
                  href={data.relatedProfilesContinuationHref}
                  className="text-link inline-block text-sm"
                >
                  Continue {isFallback ? "trending" : "related"} profiles
                </Link>
              ) : null}
            </>
          ) : (
            <EmptyState
              message="Related profiles are not available for this account yet."
              actions={
                <Link href="/trending/profiles" className="text-link text-sm">
                  Browse trending profiles
                </Link>
              }
            />
          )}
        </div>
      </SectionCard>

      <div className="mt-3 space-y-3">
        <DebugDisclosure
          title="Debug payload: related profiles fallback"
          data={data.relatedProfilesFallbackPayload ?? {}}
        />
      </div>
    </div>
  );
}
