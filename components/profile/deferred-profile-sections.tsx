import Link from "next/link";

import { ArticlesList, NotesList, ProfilesList } from "@/components/data/renderers";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { ProfileActivityTabs } from "@/components/profile/profile-activity-tabs";
import {
  ProfileReactionsActivityList,
  ProfileZapsActivityList,
} from "@/components/profile/profile-engagement-activity-list";
import { SectionCard } from "@/components/ui/section-card";
import {
  loadProfileActivityData,
  loadProfileDiscoveryData,
} from "@/lib/profile/load-profile-page-data";
import type { ProfileActivityTab } from "@/lib/profile/activity-tabs";
import type { Profile } from "@/lib/types/api";

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

  return (
    <div id="profile-activity">
      <SectionCard
        title="Recent activity"
        description="Browse this profile's latest notes, replies, reactions, and zaps."
      >
        <div className="space-y-4">
          <ProfileActivityTabs activeTab={data.activityTab} tabs={data.activityTabs} />
          {data.activityTab === "notes" ? (
            data.notes.length > 0 ? (
              <NotesList notes={data.notes} authorsByPubkey={data.notesAuthorMap} />
            ) : (
              <EmptyState message={activityEmptyMessage("notes")} />
            )
          ) : null}
          {data.activityTab === "replies" ? (
            data.replies.length > 0 ? (
              <NotesList notes={data.replies} authorsByPubkey={data.notesAuthorMap} />
            ) : (
              <EmptyState message={activityEmptyMessage("replies")} />
            )
          ) : null}
          {data.activityTab === "reactions" ? (
            data.reactions.length > 0 ? (
              <ProfileReactionsActivityList
                reactions={data.reactions}
                targetNotesById={data.targetNotesById}
                authorsByPubkey={{ ...data.notesAuthorMap, ...data.targetNoteAuthorsByPubkey }}
              />
            ) : (
              <EmptyState message={activityEmptyMessage("reactions")} />
            )
          ) : null}
          {data.activityTab === "zaps" ? (
            data.zaps.length > 0 ? (
              <ProfileZapsActivityList
                zaps={data.zaps}
                targetNotesById={data.targetNotesById}
                authorsByPubkey={{ ...data.notesAuthorMap, ...data.targetNoteAuthorsByPubkey }}
              />
            ) : (
              <EmptyState message={activityEmptyMessage("zaps")} />
            )
          ) : null}
          {data.activityTab === "long_form" ? (
            data.longFormArticles.length > 0 ? (
              <ArticlesList
                articles={data.longFormArticles}
                authorsByPubkey={{ ...data.notesAuthorMap, ...data.eventListAuthorsByPubkey }}
              />
            ) : (
              <EmptyState message={activityEmptyMessage("long_form")} />
            )
          ) : null}
          {data.activityTab === "bookmarks" ? (
            data.bookmarks.length > 0 ? (
              <NotesList
                notes={data.bookmarks}
                authorsByPubkey={{ ...data.notesAuthorMap, ...data.eventListAuthorsByPubkey }}
              />
            ) : (
              <EmptyState message={activityEmptyMessage("bookmarks")} />
            )
          ) : null}
          {data.activityTab === "highlights" ? (
            data.highlights.length > 0 ? (
              <NotesList
                notes={data.highlights}
                authorsByPubkey={{ ...data.notesAuthorMap, ...data.eventListAuthorsByPubkey }}
              />
            ) : (
              <EmptyState message={activityEmptyMessage("highlights")} />
            )
          ) : null}
          {data.activityTab === "mute_list" ? (
            data.mutedProfiles.length > 0 ? (
              <ProfilesList profiles={data.mutedProfiles} />
            ) : (
              <EmptyState message={activityEmptyMessage("mute_list")} />
            )
          ) : null}
          {data.activityTab === "muted_by" ? (
            data.mutedByProfiles.length > 0 ? (
              <ProfilesList profiles={data.mutedByProfiles} />
            ) : (
              <EmptyState message={activityEmptyMessage("muted_by")} />
            )
          ) : null}
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

  return (
    <div id="related-profiles">
      <SectionCard
        title="Related discovery"
        description="Connected profiles and rising discovery surfaces related to this profile."
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-ink-muted text-xs font-medium">Related profiles</p>
            {data.relatedProfiles.length > 0 ? (
              <>
                <ProfilesList profiles={data.relatedProfiles.slice(0, 8)} />
                {typeof data.relatedProfilesNextCursor === "string" &&
                data.relatedProfilesNextCursor.length > 0 ? (
                  <Link
                    href={data.relatedProfilesContinuationHref}
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
            {data.risingProfiles.length > 0 ? (
              <ProfilesList profiles={data.risingProfiles.slice(0, 8)} />
            ) : (
              <EmptyState message="No rising profiles are available right now." />
            )}
          </div>
        </div>
      </SectionCard>

      <div className="mt-3 space-y-3">
        <DebugDisclosure
          title="Debug payload: related profiles fallback"
          data={data.relatedProfilesFallbackPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: rising profiles fallback"
          data={data.risingProfilesPayload ?? {}}
        />
      </div>
    </div>
  );
}
