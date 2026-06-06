import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { MetadataList } from "@/components/explorer/metadata-list";
import { NoteCard } from "@/components/explorer/note-card";
import { PageHero } from "@/components/explorer/page-hero";
import { ProfileCard } from "@/components/explorer/profile-card";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { StatCard } from "@/components/explorer/stat-card";
import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  buildMetadataEntries,
  extractPrimitiveStats,
  isRecord,
  truncateMiddle,
} from "@/components/explorer/utils";
import { ThreadView } from "@/components/thread/thread-view";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import {
  getEventAncestors,
  getEvent,
  getEventCounts,
  getEventReplies,
  getEventSeenOn,
  getNoteSummary,
  getRelatedNotes,
  getThreadActivity,
  getThreadSummary,
  getThread,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { fetchProfilesByPubkey, listHydratablePubkeys } from "@/lib/api/profile-hydration";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import type { EventRecord, Profile } from "@/lib/types/api";

type Params = Promise<{ eventId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

function hasCanonicalPayloadFields(note: EventRecord | undefined, eventId: string): boolean {
  if (!note) return false;
  if (typeof note.id !== "string" || note.id.length === 0) return false;
  if (note.id !== eventId) return false;
  if (typeof note.pubkey !== "string" || note.pubkey.length === 0) return false;
  if (typeof note.content !== "string") return false;
  if (typeof note.created_at !== "number" || !Number.isFinite(note.created_at)) return false;
  return typeof note.kind === "number" && Number.isFinite(note.kind);
}

function toThreadRoute(eventId: string): string {
  return `/search?q=${encodeURIComponent(eventId)}&tab=notes`;
}

const getNoteSummaryCached = cache(async (eventId: string) => getNoteSummary(eventId, "shortTtl"));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { eventId } = await params;
  try {
    const payload = await getNoteSummaryCached(eventId);
    const content = payload.note?.content;
    const author = payload.note?.pubkey;
    const preview =
      typeof content === "string" && content.trim().length > 0
        ? truncateMiddle(content.trim(), 64)
        : truncateMiddle(eventId, 20);
    return {
      title: author
        ? `Note by ${truncateMiddle(author, 20)}`
        : `Note ${truncateMiddle(eventId, 18)}`,
      description: `View the note, thread, and related activity: ${preview}`,
    };
  } catch {
    return {
      title: `Note ${truncateMiddle(eventId, 18)}`,
      description: "View the note, thread, and related activity.",
    };
  }
}

export default async function NotePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;
  const repliesCursor = readSearchParam(resolvedSearchParams, "replies_cursor");
  const activityCursor = readSearchParam(resolvedSearchParams, "activity_cursor");
  const relatedCursor = readSearchParam(resolvedSearchParams, "related_cursor");
  const viewMode = readSearchParam(resolvedSearchParams, "view");
  const includeExtendedContext = viewMode === "full";
  const includeThreadActivity = includeExtendedContext || typeof activityCursor === "string";
  const includeRelatedNotes = includeExtendedContext || typeof relatedCursor === "string";
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);

  let errorMessage = "";
  let eventPayload: Awaited<ReturnType<typeof getEvent>> | null = null;
  let eventSeenOnPayload: Awaited<ReturnType<typeof getEventSeenOn>> | null = null;
  let eventCountsPayload: Awaited<ReturnType<typeof getEventCounts>> | null = null;
  let noteSummary: Awaited<ReturnType<typeof getNoteSummary>> | null = null;
  let threadPayload: Awaited<ReturnType<typeof getThread>> | null = null;
  let ancestorsPayload: Awaited<ReturnType<typeof getEventAncestors>> | null = null;
  let repliesPayload: Awaited<ReturnType<typeof getEventReplies>> | null = null;
  let relatedPayload: Awaited<ReturnType<typeof getRelatedNotes>> | null = null;
  let threadSummaryPayload: Awaited<ReturnType<typeof getThreadSummary>> | null = null;
  let threadActivityPayload: Awaited<ReturnType<typeof getThreadActivity>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};

  const [noteSummaryResult, threadResult, ancestorsResult, repliesResult, relatedResult] =
    await Promise.allSettled([
      getNoteSummaryCached(eventId),
      getThread(eventId, "shortTtl"),
      getEventAncestors(eventId, "shortTtl"),
      getEventReplies(eventId, "shortTtl", { cursor: repliesCursor }),
      includeRelatedNotes
        ? getRelatedNotes(eventId, "shortTtl", { cursor: relatedCursor })
        : Promise.resolve(null),
    ]);

  if (noteSummaryResult.status === "fulfilled") {
    noteSummary = noteSummaryResult.value;
  }
  if (threadResult.status === "fulfilled") {
    threadPayload = threadResult.value;
  }
  if (ancestorsResult.status === "fulfilled") {
    ancestorsPayload = ancestorsResult.value;
  }
  if (repliesResult.status === "fulfilled") {
    repliesPayload = repliesResult.value;
  }
  if (relatedResult.status === "fulfilled") {
    relatedPayload = relatedResult.value;
  }

  const focalFromPrimary = noteSummary?.note ?? threadPayload?.root;
  const shouldFetchCanonicalEvent = !hasCanonicalPayloadFields(focalFromPrimary, eventId);
  const shouldFetchCounts =
    !isRecord(noteSummary?.counts) || Object.keys(noteSummary.counts).length === 0;
  const summaryProvenance = isRecord(noteSummary?.provenance) ? noteSummary.provenance : undefined;
  const summaryRelayHints =
    (isRecord(noteSummary) && Array.isArray((noteSummary as Record<string, unknown>).seen_on)) ||
    (isRecord(summaryProvenance) && Array.isArray(summaryProvenance.relays));
  const shouldFetchSeenOn = !summaryRelayHints;
  const enrichmentErrors: string[] = [];

  const [eventResult, seenOnResult, countsResult] = await Promise.allSettled([
    shouldFetchCanonicalEvent ? getEvent(eventId, "shortTtl") : Promise.resolve(null),
    shouldFetchSeenOn ? getEventSeenOn(eventId, "shortTtl") : Promise.resolve(null),
    shouldFetchCounts ? getEventCounts(eventId, "shortTtl") : Promise.resolve(null),
  ]);

  if (eventResult.status === "fulfilled") {
    eventPayload = eventResult.value;
  } else if (shouldFetchCanonicalEvent) {
    enrichmentErrors.push(eventResult.reason instanceof Error ? eventResult.reason.message : "");
  }
  if (seenOnResult.status === "fulfilled") {
    eventSeenOnPayload = seenOnResult.value;
  } else if (shouldFetchSeenOn) {
    enrichmentErrors.push(seenOnResult.reason instanceof Error ? seenOnResult.reason.message : "");
  }
  if (countsResult.status === "fulfilled") {
    eventCountsPayload = countsResult.value;
  } else if (shouldFetchCounts) {
    enrichmentErrors.push(countsResult.reason instanceof Error ? countsResult.reason.message : "");
  }

  if (!noteSummary && noteSummaryResult.status === "rejected") {
    enrichmentErrors.unshift(
      noteSummaryResult.reason instanceof Error
        ? noteSummaryResult.reason.message
        : "Failed to load note summary."
    );
  }
  if (!threadPayload && threadResult.status === "rejected") {
    enrichmentErrors.unshift(
      threadResult.reason instanceof Error
        ? threadResult.reason.message
        : "Failed to load note thread."
    );
  }
  if (!ancestorsPayload && ancestorsResult.status === "rejected") {
    enrichmentErrors.push(
      ancestorsResult.reason instanceof Error
        ? ancestorsResult.reason.message
        : "Failed to load ancestors."
    );
  }
  if (!repliesPayload && repliesResult.status === "rejected") {
    enrichmentErrors.push(
      repliesResult.reason instanceof Error
        ? repliesResult.reason.message
        : "Failed to load replies."
    );
  }
  if (!relatedPayload && relatedResult.status === "rejected") {
    enrichmentErrors.push(
      relatedResult.reason instanceof Error
        ? relatedResult.reason.message
        : "Failed to load related notes."
    );
  }
  const compactErrors = enrichmentErrors.filter((value) => value.length > 0);
  if (!noteSummary && !threadPayload && !eventPayload && compactErrors.length > 0) {
    errorMessage = compactErrors.join(" | ");
  }

  const threadContextFromSummary = isRecord(noteSummary?.thread) ? noteSummary.thread : {};
  const rootEventIdCandidate =
    (typeof threadContextFromSummary.root_event_id === "string"
      ? threadContextFromSummary.root_event_id
      : undefined) ??
    repliesPayload?.root_event_id ??
    threadPayload?.root?.id ??
    ancestorsPayload?.ancestors?.[0]?.id;

  if (rootEventIdCandidate && includeThreadActivity) {
    const [threadSummaryResult, threadActivityResult] = await Promise.allSettled([
      getThreadSummary(rootEventIdCandidate, "shortTtl"),
      getThreadActivity(rootEventIdCandidate, "shortTtl", { cursor: activityCursor }),
    ]);
    if (threadSummaryResult.status === "fulfilled") {
      threadSummaryPayload = threadSummaryResult.value;
    } else {
      enrichmentErrors.push(
        threadSummaryResult.reason instanceof Error
          ? threadSummaryResult.reason.message
          : "Failed to load thread summary."
      );
    }
    if (threadActivityResult.status === "fulfilled") {
      threadActivityPayload = threadActivityResult.value;
    } else {
      enrichmentErrors.push(
        threadActivityResult.reason instanceof Error
          ? threadActivityResult.reason.message
          : "Failed to load thread activity."
      );
    }
  }

  const authorProfileFromSummary =
    isRecord(noteSummary?.author) && isRecord(noteSummary.author.profile)
      ? (noteSummary.author.profile as Profile)
      : undefined;

  try {
    authorsByPubkey = await fetchProfilesByPubkey(
      listHydratablePubkeys(
        [
          eventPayload?.event,
          noteSummary?.note,
          threadPayload?.root,
          ...(ancestorsPayload?.ancestors ?? threadPayload?.ancestors ?? []),
          ...(repliesPayload?.replies ?? threadPayload?.replies ?? []),
          ...(threadActivityPayload?.activity ?? []),
          ...(relatedPayload?.related ?? []),
          authorProfileFromSummary,
        ].flatMap((note) => (note?.pubkey ? [note.pubkey] : []))
      ),
      "shortTtl"
    );
  } catch {
    authorsByPubkey = {};
  }

  if (authorProfileFromSummary?.pubkey) {
    authorsByPubkey[authorProfileFromSummary.pubkey.toLowerCase()] = authorProfileFromSummary;
  }

  const focal = noteSummary?.note ?? eventPayload?.event ?? threadPayload?.root;
  const ancestors = ancestorsPayload?.ancestors ?? threadPayload?.ancestors ?? [];
  const replies = repliesPayload?.replies ?? threadPayload?.replies ?? [];
  const missingAncestorIds =
    ancestorsPayload?.missing_ancestor_ids ?? threadPayload?.missing_ancestor_ids ?? [];
  const activity = threadActivityPayload?.activity ?? [];
  const relatedNotes = (relatedPayload?.related ?? []).filter((note) => note.id !== focal?.id);
  const repliesNextCursor = repliesPayload?.next_cursor ?? threadPayload?.next_cursor;
  const activityNextCursor = threadActivityPayload?.next_cursor;
  const relatedNextCursor = relatedPayload?.next_cursor;
  const semantics = extractNativeApiSemantics(
    noteSummary,
    eventSeenOnPayload,
    eventCountsPayload,
    threadPayload,
    ancestorsPayload,
    repliesPayload,
    threadSummaryPayload,
    threadActivityPayload,
    relatedPayload,
    eventPayload
  );
  const resolvedAuthor =
    (typeof focal?.pubkey === "string" ? authorsByPubkey[focal.pubkey.toLowerCase()] : undefined) ??
    authorProfileFromSummary;

  const noteDetails = focal
    ? buildMetadataEntries(focal as Record<string, unknown>, ["id", "pubkey", "created_at", "kind"])
    : [];
  const summaryStats = extractPrimitiveStats(
    isRecord(noteSummary?.summary) ? noteSummary?.summary : {},
    []
  ).slice(0, 6);
  const countsRecord = isRecord(noteSummary?.counts)
    ? noteSummary.counts
    : isRecord(eventCountsPayload?.counts)
      ? eventCountsPayload.counts
      : {};
  const summaryCountStats = extractPrimitiveStats(
    isRecord(noteSummary?.summary) ? noteSummary.summary : {},
    []
  ).filter((entry) => /(count|reply|reaction|repost|zap|quote|like)/i.test(entry.label));
  const directCountStats = extractPrimitiveStats(countsRecord, []).slice(0, 6);
  const countStats = directCountStats.length > 0 ? directCountStats : summaryCountStats.slice(0, 6);
  const provenanceDetails = buildMetadataEntries(
    {
      consistency: semantics.consistency,
      trust_mode: semantics.trust_mode,
      trust_applied: semantics.trust_applied,
    },
    ["consistency", "trust_mode", "trust_applied"]
  );
  const rawProvenanceRelays = Array.isArray(eventSeenOnPayload?.relays)
    ? eventSeenOnPayload.relays
    : isRecord(summaryProvenance) && Array.isArray(summaryProvenance.relays)
      ? summaryProvenance.relays
      : isRecord(noteSummary) && Array.isArray((noteSummary as Record<string, unknown>).seen_on)
        ? ((noteSummary as Record<string, unknown>).seen_on as unknown[])
        : [];
  const provenanceRelayObservations = rawProvenanceRelays
    .map((entry, index) => {
      if (typeof entry === "string") {
        const relay = entry.trim();
        const routeHost = normalizeRelayHost(relay);
        if (!relay || !routeHost) return null;
        return {
          key: `${routeHost}-${index}`,
          relay,
          routeHost,
          seenAt: undefined as string | number | undefined,
        };
      }
      if (!isRecord(entry)) return null;
      const relay =
        typeof entry.relay_url === "string"
          ? entry.relay_url
          : typeof entry.url === "string"
            ? entry.url
            : typeof entry.host === "string"
              ? entry.host
              : "";
      const routeHost = normalizeRelayHost(relay);
      if (!relay || !routeHost) return null;
      const seenAt =
        typeof entry.seen_at === "string" || typeof entry.seen_at === "number"
          ? entry.seen_at
          : typeof entry.last_seen_at === "string" || typeof entry.last_seen_at === "number"
            ? entry.last_seen_at
            : undefined;
      return {
        key: `${routeHost}-${index}`,
        relay,
        routeHost,
        seenAt,
      };
    })
    .filter(isNonNull);
  const provenanceRelayByHost = new Map(
    provenanceRelayObservations.map((observation) => [observation.routeHost, observation])
  );
  const provenanceRelayLinks = Array.from(provenanceRelayByHost.values());
  const mediaDetails = isRecord(noteSummary?.media)
    ? Object.entries(noteSummary.media).map(([label, value]) => ({ label, value }))
    : [];
  const quoteDetails = isRecord(noteSummary?.quote_repost_context)
    ? Object.entries(noteSummary.quote_repost_context).map(([label, value]) => ({ label, value }))
    : [];
  const threadContext = isRecord(noteSummary?.thread) ? noteSummary.thread : {};
  const rootEventId =
    (typeof threadContext.root_event_id === "string" ? threadContext.root_event_id : undefined) ??
    threadSummaryPayload?.root_event_id ??
    repliesPayload?.root_event_id ??
    threadPayload?.root?.id;
  const parentEventId =
    (typeof threadContext.parent_event_id === "string"
      ? threadContext.parent_event_id
      : undefined) ?? ancestors.at(-1)?.id;
  const threadSummaryStats = extractPrimitiveStats(
    {
      ...(isRecord(threadSummaryPayload?.summary) ? threadSummaryPayload.summary : {}),
      ...(isRecord(threadSummaryPayload?.counts) ? threadSummaryPayload.counts : {}),
    },
    []
  )
    .filter((entry) =>
      /(count|reply|reaction|repost|zap|quote|participant|author|depth)/i.test(entry.label)
    )
    .slice(0, 8);
  const repliesContinuationHref = buildContinuationHref(
    `/notes/${encodeURIComponent(eventId)}`,
    currentSearchParams,
    "replies_cursor",
    repliesNextCursor
  );
  const activityContinuationHref = buildContinuationHref(
    `/notes/${encodeURIComponent(eventId)}`,
    currentSearchParams,
    "activity_cursor",
    activityNextCursor
  );
  const relatedContinuationHref = buildContinuationHref(
    `/notes/${encodeURIComponent(eventId)}`,
    currentSearchParams,
    "related_cursor",
    relatedNextCursor
  );
  const extendedContextHref = buildContinuationHref(
    `/notes/${encodeURIComponent(eventId)}`,
    currentSearchParams,
    "view",
    "full"
  );
  return (
    <div className="space-y-8">
      <PageHero
        title="Note explorer"
        subtitle="View the note, its thread, and the activity around it."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            <IdBadge id={eventId} label="event" />
            {focal?.pubkey ? <IdBadge id={focal.pubkey} label="author" /> : null}
            <Timestamp unixSeconds={focal?.created_at} />
            {typeof focal?.kind === "number" ? (
              <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
                kind {focal.kind}
              </span>
            ) : null}
          </div>
        }
      />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard title="Focal note" description="The note and its core fields.">
        {focal ? (
          <NoteCard
            note={focal}
            author={
              typeof focal.pubkey === "string"
                ? authorsByPubkey[focal.pubkey.toLowerCase()]
                : undefined
            }
            showFullContent
          />
        ) : (
          <EmptyState message="No focal note payload was returned." />
        )}
      </SectionCard>

      {resolvedAuthor ? (
        <SectionCard title="Author identity" description="The author behind this note.">
          <ProfileCard
            profile={resolvedAuthor}
            summary={isRecord(noteSummary?.author) ? noteSummary.author : undefined}
          />
        </SectionCard>
      ) : null}

      {countStats.length > 0 ? (
        <section className="space-y-3">
          <p className="text-ink-dim text-sm font-medium">Counts</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {countStats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ) : null}

      {summaryStats.length > 0 ? (
        <section className="space-y-3">
          <p className="text-ink-dim text-sm font-medium">Canonical summary</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summaryStats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ) : null}

      {noteDetails.length > 0 ? (
        <SectionCard title="Note metadata" description="Core fields returned for this event.">
          <MetadataList items={noteDetails} columns={2} />
        </SectionCard>
      ) : null}

      <div id="note-provenance">
        <SectionCard
          title="Provenance"
          description="Where this event was seen and the trust data attached to it."
        >
          {provenanceDetails.length > 0 ? (
            <MetadataList items={provenanceDetails} columns={2} />
          ) : null}
          {provenanceRelayLinks.length > 0 ? (
            <div className="mt-3">
              <p className="text-ink-faint mb-2 text-xs tracking-wide uppercase">
                Relay observations
              </p>
              <ul className="space-y-2">
                {provenanceRelayLinks.map((observation) => (
                  <li
                    key={observation.key}
                    className="border-edge bg-surface/30 flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-ink-soft truncate text-sm">{observation.relay}</p>
                      <p className="text-ink-faint mt-1 truncate text-xs">
                        {observation.seenAt !== undefined
                          ? `seen at ${String(observation.seenAt)}`
                          : "seen timestamp not provided"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Link
                        href={`/relays/${encodeURIComponent(observation.routeHost)}`}
                        className="border-edge-strong hover:border-accent-soft/40 text-link rounded-full border px-3 py-1"
                      >
                        Open relay
                      </Link>
                      <Link
                        href={`/relays/health#relay-${encodeURIComponent(observation.routeHost)}`}
                        className="border-edge-strong hover:border-accent-soft/40 text-link rounded-full border px-3 py-1"
                      >
                        Health posture
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {provenanceDetails.length === 0 && provenanceRelayLinks.length === 0 ? (
            <EmptyState message="No relay observations or trust data were returned for this event." />
          ) : null}
        </SectionCard>
      </div>

      {mediaDetails.length > 0 ? (
        <SectionCard
          title="Media summary"
          description="Media and attachment details returned for this note."
        >
          <MetadataList items={mediaDetails} columns={2} />
        </SectionCard>
      ) : null}

      {quoteDetails.length > 0 ? (
        <SectionCard
          title="Quote or repost context"
          description="Quoted or reposted note context attached to this event."
        >
          <MetadataList items={quoteDetails} columns={2} />
        </SectionCard>
      ) : null}

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

      <div id="conversation-context">
        <SectionCard
          title="Conversation context"
          description="The surrounding thread for this note."
        >
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
            ancestors={ancestors}
            focal={focal}
            replies={replies}
            missingAncestorIds={missingAncestorIds}
            nextCursor={repliesNextCursor}
            continuationHref={repliesContinuationHref}
            continuationLabel="Continue replies"
            authorsByPubkey={authorsByPubkey}
          />
        </SectionCard>
      </div>

      <div id="thread-activity">
        {includeThreadActivity ? (
          <SectionCard title="Thread activity" description="Recent activity from this thread.">
            {activity.length > 0 ? (
              <div className="space-y-3">
                {activity.map((note, index) => (
                  <NoteCard
                    key={note.id ?? `activity-${index}`}
                    note={note}
                    author={
                      typeof note.pubkey === "string"
                        ? authorsByPubkey[note.pubkey.toLowerCase()]
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No activity entries were returned for this thread." />
            )}
            {typeof activityNextCursor === "string" && activityNextCursor.length > 0 ? (
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
            <div className="border-edge bg-surface/40 rounded-md border p-3">
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

      <div id="related-notes">
        {includeRelatedNotes ? (
          <SectionCard title="Related notes" description="Other notes linked to this one.">
            {relatedNotes.length > 0 ? (
              <div className="space-y-3">
                {relatedNotes.map((note, index) => (
                  <NoteCard
                    key={note.id ?? `related-${index}`}
                    note={note}
                    author={
                      typeof note.pubkey === "string"
                        ? authorsByPubkey[note.pubkey.toLowerCase()]
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No related notes were returned for this event." />
            )}
            {typeof relatedNextCursor === "string" && relatedNextCursor.length > 0 ? (
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
            <div className="border-edge bg-surface/40 rounded-md border p-3">
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

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: canonical event" data={eventPayload ?? {}} />
        <DebugDisclosure title="Debug payload: note summary" data={noteSummary ?? {}} />
        <DebugDisclosure title="Debug payload: event counts" data={eventCountsPayload ?? {}} />
        <DebugDisclosure title="Debug payload: event seen-on" data={eventSeenOnPayload ?? {}} />
        <DebugDisclosure title="Debug payload: thread" data={threadPayload ?? {}} />
        <DebugDisclosure title="Debug payload: ancestors" data={ancestorsPayload ?? {}} />
        <DebugDisclosure title="Debug payload: replies" data={repliesPayload ?? {}} />
        <DebugDisclosure title="Debug payload: thread summary" data={threadSummaryPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: thread activity"
          data={threadActivityPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: related notes" data={relatedPayload ?? {}} />
      </div>
    </div>
  );
}
