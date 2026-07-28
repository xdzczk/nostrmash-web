import Link from "next/link";

import { NoteCard } from "@/components/explorer/note-card";
import { EmptyState } from "@/components/explorer/empty-state";
import { StatCard } from "@/components/explorer/stat-card";
import { extractPrimitiveStats } from "@/components/explorer/utils";
import { ThreadView } from "@/components/thread/thread-view";
import { SectionCard } from "@/components/ui/section-card";
import {
  loadNoteActivityData,
  loadNoteRelatedData,
  loadNoteThreadData,
} from "@/lib/notes/load-note-page-data";
import { buildContinuationHref } from "@/lib/search-params/pagination";
import type { EventRecord } from "@/lib/types/api";

function toThreadRoute(eventId: string): string {
  return `/search?q=${encodeURIComponent(eventId)}&tab=notes`;
}

export async function DeferredNoteThread({
  eventId,
  searchParams,
  focal,
  rootEventId: rootFromFocal,
  parentEventId,
}: {
  eventId: string;
  searchParams: Record<string, string | string[] | undefined>;
  focal: EventRecord | null | undefined;
  rootEventId?: string;
  parentEventId?: string;
}) {
  const data = await loadNoteThreadData(eventId, searchParams);
  const rootEventId = rootFromFocal ?? data.rootEventId;
  const repliesContinuationHref = buildContinuationHref(
    `/notes/${encodeURIComponent(eventId)}`,
    new URLSearchParams(
      Object.entries(searchParams).flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value]] : []
      )
    ),
    "replies_cursor",
    data.repliesNextCursor
  );

  return (
    <div id="conversation-context">
      <SectionCard title="Conversation context" description="The surrounding thread for this note.">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <Link
            href="/discovery/conversations/hot"
            className="border-edge-strong text-ink-dim hover:text-ink-strong rounded-full border px-2 py-1"
          >
            Explore hot conversations
          </Link>
          <Link
            href="/discovery/profiles/rising"
            className="border-edge-strong text-ink-dim hover:text-ink-strong rounded-full border px-2 py-1"
          >
            Explore rising profiles
          </Link>
          {rootEventId ? (
            <Link
              href={`/notes/${encodeURIComponent(rootEventId)}`}
              className="border-edge-strong text-ink-dim hover:text-ink-strong rounded-full border px-2 py-1"
            >
              Open thread root
            </Link>
          ) : null}
          {parentEventId ? (
            <Link
              href={`/notes/${encodeURIComponent(parentEventId)}`}
              className="border-edge-strong text-ink-dim hover:text-ink-strong rounded-full border px-2 py-1"
            >
              Open parent note
            </Link>
          ) : null}
          <Link
            href={toThreadRoute(rootEventId ?? eventId)}
            className="border-edge-strong text-ink-dim hover:text-ink-strong rounded-full border px-2 py-1"
          >
            View related thread activity
          </Link>
        </div>
        <ThreadView
          ancestors={data.ancestors}
          focal={focal ?? undefined}
          replies={data.replies}
          missingAncestorIds={data.missingAncestorIds}
          nextCursor={data.repliesNextCursor}
          continuationHref={repliesContinuationHref}
          continuationLabel="Continue replies"
          authorsByPubkey={data.authorsByPubkey}
        />
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
  const extendedContextHref = buildContinuationHref(
    `/notes/${encodeURIComponent(eventId)}`,
    new URLSearchParams(
      Object.entries(searchParams).flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value]] : []
      )
    ),
    "view",
    "full"
  );
  const activityContinuationHref = buildContinuationHref(
    `/notes/${encodeURIComponent(eventId)}`,
    new URLSearchParams(
      Object.entries(searchParams).flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value]] : []
      )
    ),
    "activity_cursor",
    data.activityNextCursor
  );
  const threadSummaryStats = extractPrimitiveStats(data.threadSummaryPayload ?? {}, []).slice(0, 8);

  return (
    <>
      {threadSummaryStats.length > 0 ? (
        <section className="space-y-3">
          <p className="text-ink-dim text-sm font-medium">Thread activity summary</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {threadSummaryStats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ) : null}
      <div id="thread-activity">
        {data.includeThreadActivity ? (
          <SectionCard title="Thread activity" description="Recent activity from this thread.">
            {data.activity.length > 0 ? (
              <div className="space-y-3">
                {data.activity.map((note, index) => (
                  <NoteCard
                    key={note.id ?? `activity-${index}`}
                    note={note}
                    author={
                      typeof note.pubkey === "string"
                        ? data.authorsByPubkey[note.pubkey.toLowerCase()]
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No activity entries were returned for this thread." />
            )}
            {typeof data.activityNextCursor === "string" && data.activityNextCursor.length > 0 ? (
              <div className="border-accent/30 bg-accent/10 mt-4 rounded-md border p-3">
                <p className="text-accent-ink text-xs">More thread activity is available.</p>
                <Link
                  href={activityContinuationHref}
                  className="border-accent/40 text-link-hover hover:text-accent-ink mt-2 inline-block rounded-full border px-3 py-1 text-xs"
                >
                  Continue activity
                </Link>
              </div>
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard title="Thread activity" description="Recent activity from this thread.">
            <div className="hover:bg-surface/40 rounded-lg p-3 transition-colors">
              <p className="text-ink-dim text-xs">
                Extended thread context is skipped for faster initial loads.
              </p>
              <Link href={extendedContextHref} className="text-link mt-2 inline-block text-xs">
                Load full context
              </Link>
            </div>
          </SectionCard>
        )}
      </div>
    </>
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
  const params = new URLSearchParams(
    Object.entries(searchParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : []
    )
  );
  const extendedContextHref = buildContinuationHref(
    `/notes/${encodeURIComponent(eventId)}`,
    params,
    "view",
    "full"
  );
  const relatedContinuationHref = buildContinuationHref(
    `/notes/${encodeURIComponent(eventId)}`,
    params,
    "related_cursor",
    data.relatedNextCursor
  );

  return (
    <div id="related-notes">
      {data.includeRelatedNotes ? (
        <SectionCard title="Related notes" description="Other notes linked to this one.">
          {data.relatedNotes.length > 0 ? (
            <div className="space-y-3">
              {data.relatedNotes.map((note, index) => (
                <NoteCard
                  key={note.id ?? `related-${index}`}
                  note={note}
                  author={
                    typeof note.pubkey === "string"
                      ? data.authorsByPubkey[note.pubkey.toLowerCase()]
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No related notes were returned for this event." />
          )}
          {typeof data.relatedNextCursor === "string" && data.relatedNextCursor.length > 0 ? (
            <div className="border-accent/30 bg-accent/10 mt-4 rounded-md border p-3">
              <p className="text-accent-ink text-xs">More related notes are available.</p>
              <Link
                href={relatedContinuationHref}
                className="border-accent/40 text-link-hover hover:text-accent-ink mt-2 inline-block rounded-full border px-3 py-1 text-xs"
              >
                Continue related notes
              </Link>
            </div>
          ) : null}
        </SectionCard>
      ) : (
        <SectionCard title="Related notes" description="Other notes linked to this one.">
          <div className="hover:bg-surface/40 rounded-lg p-3 transition-colors">
            <p className="text-ink-dim text-xs">
              Related-note expansion is skipped for faster initial loads.
            </p>
            <Link href={extendedContextHref} className="text-link mt-2 inline-block text-xs">
              Load full context
            </Link>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
