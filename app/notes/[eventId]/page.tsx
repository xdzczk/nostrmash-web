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
import { getEvent, getNoteSummary, getThread } from "@/lib/api/endpoints";

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

  try {
    [eventPayload, noteSummary, threadPayload] = await Promise.all([
      getEvent(eventId, "requestTime"),
      getNoteSummary(eventId, "requestTime"),
      getThread(eventId, "requestTime"),
    ]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load note details.";
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
          <NoteCard note={focal} showFullContent />
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
        </SectionCard>
      ) : null}

      <SectionCard title="Thread" description="Ancestors, focal note, and replies in one view.">
        <ThreadView
          ancestors={threadPayload?.ancestors ?? []}
          focal={threadPayload?.root ?? focal}
          replies={threadPayload?.replies ?? []}
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
