import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EntityActions } from "@/components/actions/entity-actions";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { MetadataList } from "@/components/explorer/metadata-list";
import { NoteCard } from "@/components/explorer/note-card";
import { PageHero } from "@/components/explorer/page-hero";
import { ProfileCard } from "@/components/explorer/profile-card";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { StatCard } from "@/components/explorer/stat-card";
import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  buildMetadataEntries,
  extractPrimitiveStats,
  isRecord,
  profileFallbackAvatarDataUrl,
  profileLabel,
  profilePictureUrl,
  truncateMiddle,
} from "@/components/explorer/utils";
import {
  DeferredNoteActivity,
  DeferredNoteRelated,
  DeferredNoteThread,
} from "@/components/notes/deferred-note-sections";
import { JsonLd } from "@/components/seo/json-ld";
import { Disclosure } from "@/components/ui/disclosure";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { encodeNevent, hexToNote } from "@/lib/nostr/nip19";
import { getNoteSummaryCached, loadNoteFocalData } from "@/lib/notes/load-note-page-data";
import { isValidEventIdParam, resolveEventIdParam } from "@/lib/routing/params";
import { absoluteUrl, buildEntityMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ eventId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { eventId } = await params;
  if (!isValidEventIdParam(eventId)) {
    return {
      title: "Note not found",
      description: "This note identifier is invalid.",
    };
  }
  const resolvedId = resolveEventIdParam(eventId) ?? eventId;
  try {
    const payload = await getNoteSummaryCached(resolvedId);
    const content = payload.note?.content;
    const authorFromSummary = payload.author?.profile;
    const authorLabel = authorFromSummary ? profileLabel(authorFromSummary) : null;
    const contentPreview =
      typeof content === "string" && content.trim().length > 0
        ? truncateMiddle(content.trim(), 140)
        : null;
    const title = authorLabel ? `Note by ${authorLabel}` : contentPreview ? contentPreview : "Note";
    return buildEntityMetadata({
      title,
      description: contentPreview
        ? `View the note, thread, and related activity: ${contentPreview}`
        : "View the note, thread, and related activity.",
      path: `/notes/${encodeURIComponent(resolvedId)}`,
      imagePath: `/notes/${encodeURIComponent(resolvedId)}/opengraph-image`,
      type: "article",
    });
  } catch {
    return buildEntityMetadata({
      title: "Note",
      description: "View the note, thread, and related activity.",
      path: `/notes/${encodeURIComponent(resolvedId)}`,
      type: "article",
    });
  }
}

export default async function NotePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { eventId: eventIdParam } = await params;
  if (!isValidEventIdParam(eventIdParam)) {
    notFound();
  }
  const eventId = resolveEventIdParam(eventIdParam) ?? eventIdParam;
  const resolvedSearchParams = await searchParams;
  const {
    authorsByPubkey,
    contentResolution,
    errorMessage,
    eventCountsPayload,
    eventPayload,
    eventSeenOnPayload,
    focal,
    noteSummary,
    parentEventId,
    resolvedAuthor,
    rootEventId,
    semantics,
    summaryProvenance,
  } = await loadNoteFocalData(eventId);

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
  const noteBech32 =
    encodeNevent({
      id: eventId,
      author: typeof focal?.pubkey === "string" ? focal.pubkey : undefined,
      kind: typeof focal?.kind === "number" ? focal.kind : 1,
    }) ??
    hexToNote(eventId) ??
    eventId;
  const noteAbsoluteUrl = absoluteUrl(`/notes/${encodeURIComponent(eventId)}`);
  const embedHtml = `<iframe src="${absoluteUrl(`/embed/notes/${encodeURIComponent(eventId)}`)}" width="560" height="220" style="border:0;border-radius:12px;max-width:100%" loading="lazy"></iframe>`;
  const noteContent =
    typeof focal?.content === "string" && focal.content.trim().length > 0
      ? focal.content.trim()
      : "";

  return (
    <div className="space-y-8">
      <link
        rel="alternate"
        type="application/json+oembed"
        href={absoluteUrl(`/api/oembed?url=${encodeURIComponent(noteAbsoluteUrl)}`)}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SocialMediaPosting",
          headline: noteContent.slice(0, 110) || `Note ${eventId.slice(0, 12)}`,
          articleBody: noteContent.slice(0, 500) || undefined,
          url: noteAbsoluteUrl,
          datePublished:
            typeof focal?.created_at === "number"
              ? new Date(focal.created_at * 1000).toISOString()
              : undefined,
          author: resolvedAuthor
            ? {
                "@type": "Person",
                name:
                  (typeof resolvedAuthor.display_name === "string" &&
                    resolvedAuthor.display_name) ||
                  (typeof resolvedAuthor.name === "string" && resolvedAuthor.name) ||
                  resolvedAuthor.pubkey,
                url: absoluteUrl(
                  `/profiles/${encodeURIComponent(
                    (typeof resolvedAuthor.npub === "string" && resolvedAuthor.npub) ||
                      (typeof resolvedAuthor.pubkey === "string" && resolvedAuthor.pubkey) ||
                      ""
                  )}`
                ),
              }
            : undefined,
        }}
      />
      <PageHero
        title="Note"
        subtitle="Author, content, and conversation — with provenance available when you need it."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {resolvedAuthor ? (
              <span className="border-edge-strong bg-surface/50 text-ink-soft inline-flex items-center gap-2 rounded-full border px-2 py-1">
                <Image
                  src={
                    profilePictureUrl(resolvedAuthor) ??
                    profileFallbackAvatarDataUrl(resolvedAuthor)
                  }
                  alt=""
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] rounded-full object-cover"
                />
                {profileLabel(resolvedAuthor)}
              </span>
            ) : focal?.pubkey ? (
              <IdBadge id={focal.pubkey} label="author" />
            ) : null}
            <Timestamp unixSeconds={focal?.created_at} />
          </div>
        }
      />

      {errorMessage ? (
        focal ? (
          <SoftRefreshNote message={errorMessage} />
        ) : (
          <ErrorPanel message={errorMessage} />
        )
      ) : null}

      <SectionCard title="Note" description="The reading surface for this event.">
        {focal ? (
          <div className="space-y-4">
            <NoteCard
              note={focal}
              author={
                typeof focal.pubkey === "string"
                  ? authorsByPubkey[focal.pubkey.toLowerCase()]
                  : undefined
              }
              showFullContent
              contentResolution={contentResolution}
            />
            <EntityActions
              kind="note"
              absoluteUrl={noteAbsoluteUrl}
              identifier={noteBech32}
              nostrUri={`nostr:${noteBech32}`}
              njumpUrl={`https://njump.me/${noteBech32}`}
              embedHtml={embedHtml}
            />
          </div>
        ) : (
          <EmptyState message="No focal note payload was returned." />
        )}
      </SectionCard>

      {resolvedAuthor ? (
        <SectionCard title="Author" description="Who published this note.">
          <ProfileCard
            profile={resolvedAuthor}
            summary={isRecord(noteSummary?.author) ? noteSummary.author : undefined}
          />
        </SectionCard>
      ) : null}

      {countStats.length > 0 ? (
        <section className="space-y-3">
          <p className="text-ink-dim text-sm font-medium">Engagement</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {countStats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ) : null}

      <Disclosure
        title="Details & provenance"
        description="Canonical summary, metadata, and relay observations."
      >
        <div className="space-y-4">
          {summaryStats.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summaryStats.map((stat) => (
                <StatCard key={stat.label} label={stat.label} value={stat.value} />
              ))}
            </div>
          ) : null}
          {noteDetails.length > 0 ? <MetadataList items={noteDetails} columns={2} /> : null}
          <div id="note-provenance" className="space-y-3">
            {provenanceDetails.length > 0 ? (
              <MetadataList items={provenanceDetails} columns={2} />
            ) : null}
            {provenanceRelayLinks.length > 0 ? (
              <ul className="space-y-2">
                {provenanceRelayLinks.map((observation) => (
                  <li
                    key={observation.key}
                    className="bg-surface/30 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-ink-soft truncate text-sm">{observation.relay}</p>
                      <p className="text-ink-faint mt-1 truncate text-xs">
                        {observation.seenAt !== undefined ? (
                          <>
                            seen{" "}
                            <Timestamp
                              unixSeconds={
                                typeof observation.seenAt === "number"
                                  ? observation.seenAt
                                  : undefined
                              }
                              isoString={
                                typeof observation.seenAt === "string"
                                  ? observation.seenAt
                                  : undefined
                              }
                            />
                          </>
                        ) : (
                          "seen timestamp not provided"
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/relays/${encodeURIComponent(observation.routeHost)}`}
                      className="border-edge-strong text-link rounded-full border px-3 py-1 text-xs"
                    >
                      Open relay
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {provenanceDetails.length === 0 && provenanceRelayLinks.length === 0 ? (
              <EmptyState message="No relay observations or trust data were returned for this event." />
            ) : null}
          </div>
        </div>
      </Disclosure>

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

      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <DeferredNoteThread
          eventId={eventId}
          searchParams={resolvedSearchParams}
          focal={focal}
          rootEventId={rootEventId}
          parentEventId={parentEventId}
        />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
        <DeferredNoteActivity
          eventId={eventId}
          rootEventId={rootEventId ?? eventId}
          searchParams={resolvedSearchParams}
        />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
        <DeferredNoteRelated eventId={eventId} searchParams={resolvedSearchParams} />
      </Suspense>

      <AboutThisData semantics={semantics}>
        <IdBadge id={eventId} label="event" />
        {focal?.pubkey ? <IdBadge id={focal.pubkey} label="author" /> : null}
        {typeof focal?.kind === "number" ? (
          <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
            kind {focal.kind}
          </span>
        ) : null}
      </AboutThisData>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: canonical event" data={eventPayload ?? {}} />
        <DebugDisclosure title="Debug payload: note summary" data={noteSummary ?? {}} />
        <DebugDisclosure title="Debug payload: event counts" data={eventCountsPayload ?? {}} />
        <DebugDisclosure title="Debug payload: event seen-on" data={eventSeenOnPayload ?? {}} />
      </div>
    </div>
  );
}
