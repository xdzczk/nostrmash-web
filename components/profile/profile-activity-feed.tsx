import { ArticlesList, NotesList, ProfilesList } from "@/components/data/renderers";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import {
  ProfileReactionsActivityList,
  ProfileZapsActivityList,
} from "@/components/profile/profile-engagement-activity-list";
import { ProfileHighlightsList } from "@/components/profile/profile-highlights-list";
import { ProfilePinsList } from "@/components/profile/profile-pins-list";
import { ProfileRepliesList } from "@/components/profile/profile-replies-list";
import { resolveContentReferences } from "@/lib/notes/resolve-content-refs";
import type { loadProfileActivityData } from "@/lib/profile/load-profile-page-data";

type ActivityData = Awaited<ReturnType<typeof loadProfileActivityData>>;

async function engagementLineResolution(
  data: ActivityData
): Promise<NoteContentResolution | undefined> {
  const inputs =
    data.activityTab === "replies"
      ? [...data.replies, ...Object.values(data.replyParentsById)]
      : data.activityTab === "reactions" || data.activityTab === "zaps"
        ? Object.values(data.targetNotesById)
        : [];
  if (inputs.length === 0) return undefined;
  const resolution = await resolveContentReferences(inputs).catch(() => undefined);
  if (!resolution) return undefined;
  resolution.profilesByPubkey = {
    ...resolution.profilesByPubkey,
    ...data.notesAuthorMap,
    ...data.replyParentAuthorsByPubkey,
    ...data.targetNoteAuthorsByPubkey,
  };
  return resolution;
}

/** One page of the active profile activity tab. Empty tabs render nothing. */
export async function ProfileActivityFeed({ data }: { data: ActivityData }) {
  const resolution = await engagementLineResolution(data);

  switch (data.activityTab) {
    case "notes":
      return data.notes.length > 0 ? (
        <NotesList
          notes={data.notes}
          authorsByPubkey={data.notesAuthorMap}
          showAuthor={false}
          showUtilityLinks={false}
          omitZeroStats
          mediaVariant="feed"
          suppressEmbeds
          contentSize="profile"
        />
      ) : null;
    case "replies":
      return data.replies.length > 0 ? (
        <ProfileRepliesList
          replies={data.replies}
          parentsById={data.replyParentsById}
          authorsByPubkey={{
            ...data.notesAuthorMap,
            ...data.replyParentAuthorsByPubkey,
          }}
          resolution={resolution}
        />
      ) : null;
    case "reactions":
      return data.reactions.length > 0 ? (
        <ProfileReactionsActivityList
          reactions={data.reactions}
          targetNotesById={data.targetNotesById}
          authorsByPubkey={{ ...data.notesAuthorMap, ...data.targetNoteAuthorsByPubkey }}
          resolution={resolution}
        />
      ) : null;
    case "zaps":
      return data.zaps.length > 0 ? (
        <ProfileZapsActivityList
          zaps={data.zaps}
          targetNotesById={data.targetNotesById}
          authorsByPubkey={{ ...data.notesAuthorMap, ...data.targetNoteAuthorsByPubkey }}
          resolution={resolution}
        />
      ) : null;
    case "long_form":
      return data.longFormArticles.length > 0 ? (
        <ArticlesList
          articles={data.longFormArticles}
          authorsByPubkey={{ ...data.notesAuthorMap, ...data.eventListAuthorsByPubkey }}
          showAuthor={false}
          showUtilityLinks={false}
          omitZeroStats
        />
      ) : null;
    case "media":
      return data.mediaEvents.length > 0 ? (
        <NotesList
          notes={data.mediaEvents}
          authorsByPubkey={{ ...data.notesAuthorMap, ...data.eventListAuthorsByPubkey }}
          showAuthor={false}
          showUtilityLinks={false}
          omitZeroStats
        />
      ) : null;
    case "bookmarks":
      return data.bookmarks.length > 0 ? (
        <NotesList
          notes={data.bookmarks}
          authorsByPubkey={{ ...data.notesAuthorMap, ...data.eventListAuthorsByPubkey }}
          showUtilityLinks={false}
          omitZeroStats
          mediaVariant="feed"
          suppressEmbeds
          contentSize="profile"
        />
      ) : null;
    case "highlights":
      return data.highlights.length > 0 ? (
        <ProfileHighlightsList highlights={data.highlights} />
      ) : null;
    case "live":
      return data.liveEvents.length > 0 ? (
        <NotesList
          notes={data.liveEvents}
          authorsByPubkey={{ ...data.notesAuthorMap, ...data.eventListAuthorsByPubkey }}
          showAuthor={false}
          showUtilityLinks={false}
          omitZeroStats
        />
      ) : null;
    case "pins":
      return data.pins.length > 0 ? (
        <ProfilePinsList
          pins={data.pins}
          eventsById={data.pinnedEventsById}
          authorsByPubkey={{ ...data.notesAuthorMap, ...data.eventListAuthorsByPubkey }}
        />
      ) : null;
    case "mute_list":
      return data.mutedProfiles.length > 0 ? <ProfilesList profiles={data.mutedProfiles} /> : null;
    case "muted_by":
      return data.mutedByProfiles.length > 0 ? (
        <ProfilesList profiles={data.mutedByProfiles} />
      ) : null;
  }
}
