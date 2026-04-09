import type { Metadata } from "next";
import Link from "next/link";

import { ConsistencyBadge } from "@/components/explorer/consistency-badge";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { MetadataList } from "@/components/explorer/metadata-list";
import { NoteCard } from "@/components/explorer/note-card";
import { PageHero } from "@/components/explorer/page-hero";
import { ProfileCard } from "@/components/explorer/profile-card";
import { StatCard } from "@/components/explorer/stat-card";
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
  getEvent,
  getEventCounts,
  getEventSeenOn,
  getNoteSummary,
  getProfilesBatch,
  getThread,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import type { EventRecord, Profile } from "@/lib/types/api";

type Params = Promise<{ eventId: string }>;

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

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { eventId } = await params;
  try {
    const payload = await getNoteSummary(eventId, "requestTime");
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
      description: `NostrMash note explorer: ${preview}`,
    };
  } catch {
    return {
      title: `Note ${truncateMiddle(eventId, 18)}`,
      description: "NostrMash note explorer page.",
    };
  }
}

export default async function NotePage({ params }: { params: Params }) {
  const { eventId } = await params;

  let errorMessage = "";
  let eventPayload: Awaited<ReturnType<typeof getEvent>> | null = null;
  let eventSeenOnPayload: Awaited<ReturnType<typeof getEventSeenOn>> | null = null;
  let eventCountsPayload: Awaited<ReturnType<typeof getEventCounts>> | null = null;
  let noteSummary: Awaited<ReturnType<typeof getNoteSummary>> | null = null;
  let threadPayload: Awaited<ReturnType<typeof getThread>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};

  const [noteSummaryResult, threadResult] = await Promise.allSettled([
    getNoteSummary(eventId, "requestTime"),
    getThread(eventId, "requestTime"),
  ]);

  if (noteSummaryResult.status === "fulfilled") {
    noteSummary = noteSummaryResult.value;
  }
  if (threadResult.status === "fulfilled") {
    threadPayload = threadResult.value;
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
    shouldFetchCanonicalEvent ? getEvent(eventId, "requestTime") : Promise.resolve(null),
    shouldFetchSeenOn ? getEventSeenOn(eventId, "requestTime") : Promise.resolve(null),
    shouldFetchCounts ? getEventCounts(eventId, "requestTime") : Promise.resolve(null),
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
  const compactErrors = enrichmentErrors.filter((value) => value.length > 0);
  if (!noteSummary && !threadPayload && !eventPayload && compactErrors.length > 0) {
    errorMessage = compactErrors.join(" | ");
  }

  const authorProfileFromSummary =
    isRecord(noteSummary?.author) && isRecord(noteSummary.author.profile)
      ? (noteSummary.author.profile as Profile)
      : undefined;

  try {
    const noteAuthors = await getProfilesBatch(
      [
        eventPayload?.event,
        noteSummary?.note,
        threadPayload?.root,
        ...(threadPayload?.ancestors ?? []),
        ...(threadPayload?.replies ?? []),
        authorProfileFromSummary,
      ]
        .flatMap((note) => (note?.pubkey ? [note.pubkey] : []))
        .filter((pubkey): pubkey is string => typeof pubkey === "string"),
      "requestTime"
    );
    authorsByPubkey = Object.fromEntries(
      noteAuthors
        .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
        .map((profile) => [profile.pubkey.toLowerCase(), profile])
    );
  } catch {
    authorsByPubkey = {};
  }

  if (authorProfileFromSummary?.pubkey) {
    authorsByPubkey[authorProfileFromSummary.pubkey.toLowerCase()] = authorProfileFromSummary;
  }

  const focal = noteSummary?.note ?? eventPayload?.event ?? threadPayload?.root;
  const semantics = extractNativeApiSemantics(
    noteSummary,
    eventSeenOnPayload,
    eventCountsPayload,
    threadPayload,
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
  const provenanceRelays = rawProvenanceRelays
    .map((entry, index) => {
      if (typeof entry === "string") {
        return { label: `relay_${index + 1}`, value: entry };
      }
      if (!isRecord(entry)) return null;
      return {
        label: `relay_${index + 1}`,
        value:
          typeof entry.relay_url === "string"
            ? `${entry.relay_url}${typeof entry.seen_at === "string" ? ` (${entry.seen_at})` : ""}`
            : JSON.stringify(entry),
      };
    })
    .filter(isNonNull);
  const mediaDetails = isRecord(noteSummary?.media)
    ? Object.entries(noteSummary.media).map(([label, value]) => ({ label, value }))
    : [];
  const quoteDetails = isRecord(noteSummary?.quote_repost_context)
    ? Object.entries(noteSummary.quote_repost_context).map(([label, value]) => ({ label, value }))
    : [];
  const threadContext = isRecord(noteSummary?.thread) ? noteSummary.thread : {};
  const rootEventId =
    (typeof threadContext.root_event_id === "string" ? threadContext.root_event_id : undefined) ??
    threadPayload?.root?.id;
  const parentEventId =
    (typeof threadContext.parent_event_id === "string"
      ? threadContext.parent_event_id
      : undefined) ?? threadPayload?.ancestors?.at(-1)?.id;
  const resultScope = semantics.result_scope;
  const resultScopeText =
    typeof resultScope === "string"
      ? resultScope
      : isRecord(resultScope)
        ? Object.entries(resultScope)
            .slice(0, 3)
            .map(([key, value]) => `${key}: ${String(value)}`)
            .join(" • ")
        : undefined;

  return (
    <div className="space-y-8">
      <PageHero
        title="Note explorer"
        subtitle="Inspect canonical note payload, author identity, counts, provenance, and thread context."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <ConsistencyBadge
              consistency={
                typeof semantics.consistency === "string" ? semantics.consistency : undefined
              }
            />
            <IdBadge id={eventId} label="event" />
            {focal?.pubkey ? <IdBadge id={focal.pubkey} label="author" /> : null}
            <Timestamp unixSeconds={focal?.created_at} />
            {typeof focal?.kind === "number" ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                kind {focal.kind}
              </span>
            ) : null}
            {typeof semantics.trust_mode === "string" ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                trust: {semantics.trust_mode}
              </span>
            ) : null}
            {typeof semantics.trust_applied === "boolean" ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                trust applied: {semantics.trust_applied ? "yes" : "no"}
              </span>
            ) : null}
            {resultScopeText ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                scope: {resultScopeText}
              </span>
            ) : null}
          </div>
        }
      />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard title="Focal note" description="Canonical note content and key identity fields.">
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
        <SectionCard title="Author identity" description="Profile identity for this note author.">
          <ProfileCard
            profile={resolvedAuthor}
            summary={isRecord(noteSummary?.author) ? noteSummary.author : undefined}
          />
        </SectionCard>
      ) : null}

      {countStats.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Counts</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {countStats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ) : null}

      {summaryStats.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Canonical summary</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summaryStats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ) : null}

      {noteDetails.length > 0 ? (
        <SectionCard title="Note metadata" description="Core event fields for this note.">
          <MetadataList items={noteDetails} columns={2} />
        </SectionCard>
      ) : null}

      {provenanceDetails.length > 0 || provenanceRelays.length > 0 ? (
        <SectionCard
          title="Provenance"
          description="Relay observations and trust metadata for this event."
        >
          {provenanceDetails.length > 0 ? (
            <MetadataList items={provenanceDetails} columns={2} />
          ) : null}
          {provenanceRelays.length > 0 ? (
            <div className="mt-3">
              <p className="mb-2 text-xs tracking-wide text-zinc-500 uppercase">
                Relay observations
              </p>
              <MetadataList items={provenanceRelays} columns={1} />
            </div>
          ) : (
            <EmptyState message="No relay observations were returned for this event." />
          )}
        </SectionCard>
      ) : null}

      {mediaDetails.length > 0 ? (
        <SectionCard
          title="Media summary"
          description="Media and attachment details from note summary."
        >
          <MetadataList items={mediaDetails} columns={2} />
        </SectionCard>
      ) : null}

      {quoteDetails.length > 0 ? (
        <SectionCard
          title="Quote or repost context"
          description="Context fields for quoted or reposted note relationships."
        >
          <MetadataList items={quoteDetails} columns={2} />
        </SectionCard>
      ) : null}

      <SectionCard title="Thread" description="Ancestors, focal note, and replies in one view.">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          {rootEventId ? (
            <Link
              href={`/notes/${encodeURIComponent(rootEventId)}`}
              className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300 hover:text-white"
            >
              Open thread root
            </Link>
          ) : null}
          {parentEventId ? (
            <Link
              href={`/notes/${encodeURIComponent(parentEventId)}`}
              className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300 hover:text-white"
            >
              Open parent note
            </Link>
          ) : null}
          <Link
            href={toThreadRoute(rootEventId ?? eventId)}
            className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300 hover:text-white"
          >
            View related thread activity
          </Link>
        </div>
        <ThreadView
          ancestors={threadPayload?.ancestors ?? []}
          focal={threadPayload?.root ?? focal}
          replies={threadPayload?.replies ?? []}
          missingAncestorIds={threadPayload?.missing_ancestor_ids ?? []}
          nextCursor={threadPayload?.next_cursor}
          authorsByPubkey={authorsByPubkey}
        />
      </SectionCard>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: canonical event" data={eventPayload ?? {}} />
        <DebugDisclosure title="Debug payload: note summary" data={noteSummary ?? {}} />
        <DebugDisclosure title="Debug payload: event counts" data={eventCountsPayload ?? {}} />
        <DebugDisclosure title="Debug payload: event seen-on" data={eventSeenOnPayload ?? {}} />
        <DebugDisclosure title="Debug payload: thread" data={threadPayload ?? {}} />
      </div>
    </div>
  );
}
