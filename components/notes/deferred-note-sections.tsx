import { cache } from "react";

import {
  loadMoreReplies,
  loadRelatedNotes,
  loadThreadActivity,
} from "@/app/notes/[eventId]/actions";
import { LoadMoreList } from "@/components/data/load-more-list";
import { NoteCard } from "@/components/explorer/note-card";
import { EmptyState } from "@/components/explorer/empty-state";
import { OnDemandSection } from "@/components/notes/on-demand-section";
import { ThreadAncestors } from "@/components/thread/thread-node";
import { ThreadView } from "@/components/thread/thread-view";
import { SectionCard } from "@/components/ui/section-card";
import {
  loadNoteActivityData,
  loadNoteRelatedData,
  loadNoteThreadData,
} from "@/lib/notes/load-note-page-data";

/** Ancestors and replies come from one fetch; both boundaries share it per request. */
const loadThreadOnce = cache(loadNoteThreadData);

/** Earlier notes in the conversation, shown above the focal note. */
export async function DeferredNoteAncestors({
  eventId,
  searchParams,
}: {
  eventId: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const data = await loadThreadOnce(eventId, searchParams);
  if (data.ancestors.length === 0) return null;
  return (
    <ThreadAncestors
      ancestors={data.ancestors}
      authorsByPubkey={data.authorsByPubkey}
      contentResolution={data.contentResolution}
    />
  );
}

export async function DeferredNoteThread({
  eventId,
  searchParams,
  replyCount,
}: {
  eventId: string;
  searchParams: Record<string, string | string[] | undefined>;
  /** Known total from the note summary, used for the heading. */
  replyCount?: number;
}) {
  const data = await loadThreadOnce(eventId, searchParams);
  const nextCursor =
    typeof data.repliesNextCursor === "string" && data.repliesNextCursor.length > 0
      ? data.repliesNextCursor
      : undefined;
  const loadMore = loadMoreReplies.bind(null, eventId);
  const title =
    typeof replyCount === "number" && replyCount > 0
      ? `${replyCount.toLocaleString()} ${replyCount === 1 ? "reply" : "replies"}`
      : "Replies";

  return (
    <div id="conversation-context" className="scroll-mt-24">
      <SectionCard title={title}>
        {data.errorMessage && data.replies.length === 0 ? (
          <EmptyState message={data.errorMessage} />
        ) : (
          <ThreadView
            focalEventId={eventId}
            replies={data.replies}
            authorsByPubkey={data.authorsByPubkey}
            contentResolution={data.contentResolution}
            continuation={
              nextCursor ? (
                <LoadMoreList
                  initialCursor={nextCursor}
                  loadMore={loadMore}
                  label="Show more replies"
                  pendingLabel="Loading replies…"
                />
              ) : null
            }
          />
        )}
      </SectionCard>
    </div>
  );
}

export async function DeferredNoteActivity({
  eventId,
  rootEventId,
  searchParams,
}: {
  eventId: string;
  rootEventId: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const data = await loadNoteActivityData(rootEventId, searchParams);
  const load = loadThreadActivity.bind(null, rootEventId, eventId);
  const isFocalRoot = rootEventId === eventId;

  return (
    <div id="thread-activity" className="scroll-mt-24">
      <SectionCard
        title="Thread activity"
        description={
          isFocalRoot
            ? "Recent notes across this conversation."
            : "Recent notes across the whole conversation, from the root."
        }
      >
        {data.includeThreadActivity ? (
          data.activity.length > 0 ? (
            <div className="space-y-1">
              <ul className="space-y-1">
                {data.activity.map((note, index) => (
                  <li key={note.id ?? `activity-${index}`} className="min-w-0">
                    <NoteCard
                      note={note}
                      author={
                        typeof note.pubkey === "string"
                          ? data.authorsByPubkey[note.pubkey.toLowerCase()]
                          : undefined
                      }
                      density="reply"
                      contentResolution={data.contentResolution}
                      contextEventId={eventId}
                    />
                  </li>
                ))}
              </ul>
              {typeof data.activityNextCursor === "string" && data.activityNextCursor.length > 0 ? (
                <LoadMoreList
                  initialCursor={data.activityNextCursor}
                  loadMore={load}
                  label="Show more activity"
                />
              ) : null}
            </div>
          ) : (
            <EmptyState message="No activity has been indexed for this thread yet." />
          )
        ) : (
          <OnDemandSection
            load={load}
            label="Show thread activity"
            pendingLabel="Loading activity…"
            moreLabel="Show more activity"
            emptyMessage="No activity has been indexed for this thread yet."
          />
        )}
      </SectionCard>
    </div>
  );
}

export async function DeferredNoteRelated({
  eventId,
  searchParams,
}: {
  eventId: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const data = await loadNoteRelatedData(eventId, searchParams);
  const load = loadRelatedNotes.bind(null, eventId);

  return (
    <div id="related-notes" className="scroll-mt-24">
      <SectionCard title="Related notes" description="Quotes, mentions, and notes linking here.">
        {data.includeRelatedNotes ? (
          data.relatedNotes.length > 0 ? (
            <div className="space-y-1">
              <ul className="space-y-1">
                {data.relatedNotes.map((note, index) => (
                  <li key={note.id ?? `related-${index}`} className="min-w-0">
                    <NoteCard
                      note={note}
                      author={
                        typeof note.pubkey === "string"
                          ? data.authorsByPubkey[note.pubkey.toLowerCase()]
                          : undefined
                      }
                      density="reply"
                      contentResolution={data.contentResolution}
                      contextEventId={eventId}
                    />
                  </li>
                ))}
              </ul>
              {typeof data.relatedNextCursor === "string" && data.relatedNextCursor.length > 0 ? (
                <LoadMoreList
                  initialCursor={data.relatedNextCursor}
                  loadMore={load}
                  label="Show more related notes"
                />
              ) : null}
            </div>
          ) : (
            <EmptyState message="No related notes have been indexed for this event yet." />
          )
        ) : (
          <OnDemandSection
            load={load}
            label="Show related notes"
            pendingLabel="Loading related notes…"
            moreLabel="Show more related notes"
            emptyMessage="No related notes have been indexed for this event yet."
          />
        )}
      </SectionCard>
    </div>
  );
}
