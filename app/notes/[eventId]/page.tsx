import type { Metadata } from "next";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { MetadataList } from "@/components/explorer/metadata-list";
import { NoteCard } from "@/components/explorer/note-card";
import { PageHero } from "@/components/explorer/page-hero";
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
import { getEvent, getNoteSummary, getProfilesBatch, getThread } from "@/lib/api/endpoints";
import type { Profile } from "@/lib/types/api";

type Params = Promise<{ eventId: string }>;

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
  let noteSummary: Awaited<ReturnType<typeof getNoteSummary>> | null = null;
  let threadPayload: Awaited<ReturnType<typeof getThread>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};

  try {
    [eventPayload, noteSummary, threadPayload] = await Promise.all([
      getEvent(eventId, "requestTime"),
      getNoteSummary(eventId, "requestTime"),
      getThread(eventId, "requestTime"),
    ]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load note details.";
  }

  try {
    const noteAuthors = await getProfilesBatch(
      [
        eventPayload?.event,
        noteSummary?.note,
        threadPayload?.root,
        ...(threadPayload?.ancestors ?? []),
        ...(threadPayload?.replies ?? []),
      ]
        .flatMap((note) => (note?.pubkey ? [note.pubkey] : []))
        .filter((pubkey): pubkey is string => typeof pubkey === "string"),
      "requestTime"
    );
    authorsByPubkey = Object.fromEntries(
      noteAuthors
        .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
        .map((profile) => [profile.pubkey, profile])
    );
  } catch {
    authorsByPubkey = {};
  }

  const focal = eventPayload?.event ?? noteSummary?.note ?? threadPayload?.root;
  const noteDetails = focal
    ? buildMetadataEntries(focal as Record<string, unknown>, ["id", "pubkey", "created_at", "kind"])
    : [];
  const noteStats = extractPrimitiveStats(
    isRecord(noteSummary?.summary) ? noteSummary?.summary : {},
    []
  ).slice(0, 6);
  const provenanceDetails = isRecord(eventPayload?.provenance)
    ? buildMetadataEntries(eventPayload.provenance, ["source", "relay", "indexed_at"])
    : [];
  const provenanceRelays =
    isRecord(eventPayload?.provenance) && Array.isArray(eventPayload.provenance.relays)
      ? eventPayload.provenance.relays
          .filter((entry): entry is Record<string, unknown> => isRecord(entry))
          .map((entry, index) => ({
            label: `relay_${index + 1}`,
            value:
              typeof entry.relay_url === "string"
                ? `${entry.relay_url}${typeof entry.seen_at === "string" ? ` (${entry.seen_at})` : ""}`
                : JSON.stringify(entry),
          }))
      : [];
  const mediaDetails = isRecord(noteSummary?.media)
    ? Object.entries(noteSummary.media).map(([label, value]) => ({ label, value }))
    : [];
  const quoteDetails = isRecord(noteSummary?.quote_repost_context)
    ? Object.entries(noteSummary.quote_repost_context).map(([label, value]) => ({ label, value }))
    : [];

  return (
    <div className="space-y-8">
      <PageHero
        title="Note explorer"
        subtitle="Inspect note content, event metadata, and surrounding thread structure."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <IdBadge id={eventId} label="event" />
            {focal?.pubkey ? <IdBadge id={focal.pubkey} label="author" /> : null}
            <Timestamp unixSeconds={focal?.created_at} />
            {typeof focal?.kind === "number" ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                kind {focal.kind}
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
            author={typeof focal.pubkey === "string" ? authorsByPubkey[focal.pubkey] : undefined}
            showFullContent
          />
        ) : (
          <EmptyState message="No focal note payload was returned." />
        )}
      </SectionCard>

      {noteStats.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Summary metrics</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {noteStats.map((stat) => (
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

      {provenanceDetails.length > 0 ? (
        <SectionCard
          title="Provenance"
          description="Indexing/provenance fields available from the API."
        >
          <MetadataList items={provenanceDetails} columns={2} />
          {provenanceRelays.length > 0 ? (
            <div className="mt-3">
              <p className="mb-2 text-xs tracking-wide text-zinc-500 uppercase">
                Relay observations
              </p>
              <MetadataList items={provenanceRelays} columns={1} />
            </div>
          ) : null}
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
        <DebugDisclosure title="Debug payload: thread" data={threadPayload ?? {}} />
      </div>
    </div>
  );
}
