import { cache } from "react";

import { loadDirectReplies, loadMoreReplies, loadQuotes } from "@/app/notes/[eventId]/actions";
import { LoadMoreList } from "@/components/data/load-more-list";
import { NoteCard } from "@/components/explorer/note-card";
import { EmptyState } from "@/components/explorer/empty-state";
import { OnDemandSection } from "@/components/notes/on-demand-section";
import { ThreadAncestors } from "@/components/thread/thread-node";
import { ThreadView } from "@/components/thread/thread-view";
import { SectionCard } from "@/components/ui/section-card";
import { partitionRelatedNotes } from "@/lib/notes/related-notes";
import { formatThreadActivityLine } from "@/lib/notes/thread-activity";
import {
  loadNoteRelatedData,
  loadNoteThreadData,
  loadThreadActivityStats,
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
  if (data.ancestors.length === 0 && data.missingAncestorIds.length === 0) return null;
  return (
    <ThreadAncestors
      ancestors={data.ancestors}
      authorsByPubkey={data.authorsByPubkey}
      contentResolution={data.contentResolution}
      missingCount={data.missingAncestorIds.length}
    />
  );
}

export async function DeferredNoteThread({
  eventId,
  rootEventId,
  searchParams,
  replyCount,
}: {
  eventId: string;
  rootEventId: string;
  searchParams: Record<string, string | string[] | undefined>;
  /** Known total from the note summary, used for the heading. */
  replyCount?: number;
}) {
  // Activity counts describe the whole thread, so they sit beside the heading
  // only when this page is the root. A reply's own "1 reply" is a different scope.
  const isThreadRoot = eventId.toLowerCase() === rootEventId.toLowerCase();
  const [data, stats] = await Promise.all([
    loadThreadOnce(eventId, searchParams),
    isThreadRoot ? loadThreadActivityStats(rootEventId) : Promise.resolve(null),
  ]);
  const nextCursor =
    typeof data.repliesNextCursor === "string" && data.repliesNextCursor.length > 0
      ? data.repliesNextCursor
      : undefined;
  const loadMore = loadMoreReplies.bind(null, eventId);
  const title =
    typeof replyCount === "number" && replyCount > 0
      ? `${replyCount.toLocaleString()} ${replyCount === 1 ? "reply" : "replies"}`
      : data.replies.length > 0
        ? "Replies"
        : null;
  const activityLine = stats ? formatThreadActivityLine(stats) : null;

  if (!title && !activityLine && data.replies.length === 0 && !data.errorMessage) {
    return <p className="text-ink-dim py-4 text-sm">No replies yet.</p>;
  }

  return (
    <div className="pt-2">
      {title ? (
        <h2 className="text-ink mb-2 text-sm font-semibold">
          {title}
          {activityLine ? (
            <span className="text-ink-dim font-normal"> · {activityLine}</span>
          ) : null}
        </h2>
      ) : null}
      {data.errorMessage && data.replies.length === 0 ? (
        <EmptyState message={data.errorMessage} />
      ) : (
        <ThreadView
          focalEventId={eventId}
          replies={data.replies}
          authorsByPubkey={data.authorsByPubkey}
          contentResolution={data.contentResolution}
          loadDirectReplies={loadDirectReplies}
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
  const load = loadQuotes.bind(null, eventId);
  const mentions = partitionRelatedNotes(data.relatedNotes, eventId).mentions;

  return (
    <div id="related-notes" className="scroll-mt-24">
      <SectionCard title="Quotes & mentions" description="Notes that quote or mention this one.">
        {data.includeRelatedNotes ? (
          mentions.length > 0 ? (
            <ul className="space-y-1">
              {mentions.map((note, index) => (
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
          ) : (
            <EmptyState message="No quotes or mentions have been indexed for this note yet." />
          )
        ) : (
          <OnDemandSection
            load={load}
            label="Show quotes and mentions"
            pendingLabel="Loading notes…"
            moreLabel="Show more"
            emptyMessage="No quotes or mentions have been indexed for this note yet."
          />
        )}
      </SectionCard>
    </div>
  );
}
