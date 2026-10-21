import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EntityActions } from "@/components/actions/entity-actions";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EntityContextNav } from "@/components/discover/entity-context-nav";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { MetadataList } from "@/components/explorer/metadata-list";
import { getArticlePresentation, isLongFormEvent } from "@/components/explorer/article-meta";
import { EventReadingSurface } from "@/components/explorer/event-reading-surface";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { ProfileCard } from "@/components/explorer/profile-card";
import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  applyEngagementStats,
  buildMetadataEntries,
  extractEngagementStats,
  isRecord,
  profileHref,
  profileLabel,
} from "@/components/explorer/utils";
import {
  DeferredNoteActivity,
  DeferredNoteAncestors,
  DeferredNoteRelated,
  DeferredNoteThread,
} from "@/components/notes/deferred-note-sections";
import { JsonLd } from "@/components/seo/json-ld";
import { Disclosure } from "@/components/ui/disclosure";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { isHiddenNoteKind } from "@/lib/api/normalize";
import { encodeNevent, hexToNote } from "@/lib/nostr/nip19";
import { getNoteSummaryCached, loadNoteFocalData } from "@/lib/notes/load-note-page-data";
import { summarizeNoteText } from "@/lib/notes/summary-text";
import { resolveReplyParent } from "@/lib/notes/thread-tree";
import { isValidEventIdParam, resolveEventIdParam } from "@/lib/routing/params";
import { absoluteUrl, buildEntityMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ eventId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Prose measure for the focal note and its conversation. */
const READING_COLUMN = "w-full max-w-[68ch]";

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

/** `—`, empty strings, empty arrays/objects, and nullish values carry no information. */
function hasInformativeValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed !== "—" && trimmed !== "-";
  }
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return true;
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
    const note = payload.note;
    if (isHiddenNoteKind(note)) {
      return {
        title: "Note not found",
        description: "This event is not shown as a note.",
      };
    }
    const authorFromSummary = payload.author?.profile;
    const authorLabel = authorFromSummary ? profileLabel(authorFromSummary) : null;
    const article = note && isLongFormEvent(note) ? getArticlePresentation(note) : null;
    const contentPreview = summarizeNoteText(note?.content, 150) || null;
    const threadContext = isRecord(payload.thread) ? payload.thread : {};
    const isReply =
      typeof threadContext.parent_event_id === "string" ||
      (typeof threadContext.root_event_id === "string" &&
        threadContext.root_event_id !== resolvedId) ||
      (note ? Boolean(resolveReplyParent(note)) : false);
    const kindLabel = isReply ? "Reply" : "Note";
    const title = article
      ? article.title
      : authorLabel
        ? `${kindLabel} by ${authorLabel}`
        : contentPreview
          ? summarizeNoteText(note?.content, 70)
          : "Note";
    const description = article
      ? (article.summary ??
        `Read this long-form article${authorLabel ? ` by ${authorLabel}` : ""}.`)
      : contentPreview
        ? `${authorLabel ? `${authorLabel}: ` : ""}${contentPreview}`
        : "View the note, thread, and related activity.";
    return buildEntityMetadata({
      title,
      description,
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
  if (isHiddenNoteKind(focal)) {
    notFound();
  }
  const articlePresentation =
    focal && isLongFormEvent(focal) ? getArticlePresentation(focal) : null;
  const isReplyNote = Boolean(parentEventId) || (Boolean(rootEventId) && rootEventId !== eventId);

  const noteDetails = focal
    ? buildMetadataEntries(focal as Record<string, unknown>, ["id", "pubkey", "created_at", "kind"])
    : [];
  const countsRecord = isRecord(noteSummary?.counts)
    ? noteSummary.counts
    : isRecord(eventCountsPayload?.counts)
      ? eventCountsPayload.counts
      : isRecord(eventCountsPayload)
        ? eventCountsPayload
        : {};
  const countStats = extractEngagementStats(
    countsRecord,
    isRecord(noteSummary?.summary) ? noteSummary.summary : {},
    focal
  );
  const replyCount = (() => {
    const stat = countStats.find((entry) => /^repl/i.test(entry.label));
    const value = Number(stat?.value);
    return Number.isFinite(value) ? value : undefined;
  })();
  const focalWithEngagement = focal
    ? applyEngagementStats(focal, countsRecord, noteSummary?.summary)
    : null;
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
  // Index-internal summaries only surface inside "Details & provenance", and
  // only the fields that actually carry a value.
  const mediaDetails = isRecord(noteSummary?.media)
    ? Object.entries(noteSummary.media)
        .filter(([, value]) => hasInformativeValue(value))
        .map(([label, value]) => ({ label, value }))
    : [];
  const quoteDetails = isRecord(noteSummary?.quote_repost_context)
    ? Object.entries(noteSummary.quote_repost_context)
        .filter(([, value]) => hasInformativeValue(value))
        .map(([label, value]) => ({ label, value }))
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
  const authorName = resolvedAuthor ? profileLabel(resolvedAuthor) : null;
  const authorLink = profileHref(
    resolvedAuthor,
    typeof resolvedAuthor?.pubkey === "string"
      ? resolvedAuthor.pubkey
      : typeof focal?.pubkey === "string"
        ? focal.pubkey
        : undefined
  );
  const heroTitle = articlePresentation
    ? "Article"
    : `${isReplyNote ? "Reply" : "Note"}${authorName ? ` by ${authorName}` : ""}`;
  const heroSubtitle = articlePresentation
    ? [
        articlePresentation.readingMinutes
          ? `${articlePresentation.readingMinutes} min read`
          : null,
        "Full long-form on Nostr — with author, topics, and provenance.",
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <div className="space-y-6 sm:space-y-8">
      <link
        rel="alternate"
        type="application/json+oembed"
        href={absoluteUrl(`/api/oembed?url=${encodeURIComponent(noteAbsoluteUrl)}`)}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": articlePresentation ? "Article" : "SocialMediaPosting",
          headline:
            articlePresentation?.title ??
            (summarizeNoteText(noteContent, 110) || `Note ${eventId.slice(0, 12)}`),
          articleBody: noteContent || undefined,
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
      <div className="space-y-3 sm:space-y-4">
        <EntityContextNav view="notes" />
        <PageHero
          title={heroTitle}
          subtitle={heroSubtitle}
          compact
          badges={
            <div className="text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              {resolvedAuthor ? (
                authorLink ? (
                  <Link
                    href={authorLink}
                    className="border-edge-strong bg-surface/50 text-ink-soft hover:text-ink inline-flex min-h-7 items-center gap-2 rounded-full border px-2 py-0.5"
                  >
                    <ProfileAvatar
                      profile={resolvedAuthor}
                      size={18}
                      alt=""
                      className="h-[18px] w-[18px] rounded-full object-cover"
                    />
                    {authorName}
                  </Link>
                ) : (
                  <span className="border-edge-strong bg-surface/50 text-ink-soft inline-flex min-h-7 items-center gap-2 rounded-full border px-2 py-0.5">
                    <ProfileAvatar
                      profile={resolvedAuthor}
                      size={18}
                      alt=""
                      className="h-[18px] w-[18px] rounded-full object-cover"
                    />
                    {authorName}
                  </span>
                )
              ) : focal?.pubkey ? (
                <Link
                  href={`/profiles/${encodeURIComponent(focal.pubkey)}`}
                  className="inline-flex min-h-7 items-center hover:opacity-90"
                >
                  <IdBadge id={focal.pubkey} label="author" />
                </Link>
              ) : null}
              <Timestamp unixSeconds={focal?.created_at} />
              {isReplyNote && !articlePresentation ? (
                <span className="border-edge text-ink-dim inline-flex min-h-7 items-center rounded-full border px-2 py-0.5">
                  Reply in a conversation
                </span>
              ) : null}
            </div>
          }
        />
      </div>

      {errorMessage ? (
        focal ? (
          <SoftRefreshNote message={errorMessage} />
        ) : (
          <ErrorPanel message={errorMessage} />
        )
      ) : null}

      <div className={`${READING_COLUMN} space-y-6`}>
        {isReplyNote ? (
          <Suspense fallback={<Skeleton className="h-16 w-full rounded-xl" />}>
            <DeferredNoteAncestors eventId={eventId} searchParams={resolvedSearchParams} />
          </Suspense>
        ) : null}

        {focalWithEngagement ? (
          <article id="note" className="scroll-mt-24">
            <EventReadingSurface
              event={focalWithEngagement}
              author={
                typeof focalWithEngagement.pubkey === "string"
                  ? authorsByPubkey[focalWithEngagement.pubkey.toLowerCase()]
                  : undefined
              }
              contentResolution={contentResolution}
              density="detail"
              priorityMedia
            />
          </article>
        ) : (
          <EmptyState message="No focal note payload was returned." />
        )}

        {focal ? (
          <Disclosure title="Share, open in a client, or embed">
            <EntityActions
              kind="note"
              absoluteUrl={noteAbsoluteUrl}
              identifier={noteBech32}
              nostrUri={`nostr:${noteBech32}`}
              njumpUrl={`https://njump.me/${noteBech32}`}
              embedHtml={embedHtml}
            />
          </Disclosure>
        ) : null}
      </div>

      <div className={READING_COLUMN}>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <DeferredNoteThread
            eventId={eventId}
            searchParams={resolvedSearchParams}
            replyCount={replyCount}
          />
        </Suspense>
      </div>

      {resolvedAuthor ? (
        <SectionCard title="About the author">
          <ProfileCard
            profile={resolvedAuthor}
            summary={isRecord(noteSummary?.author) ? noteSummary.author : undefined}
          />
        </SectionCard>
      ) : null}

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

      <Disclosure
        id="note-provenance"
        title="Details & provenance"
        description="Event metadata, relays that served it, and how the index scoped this view."
        className="scroll-mt-24"
      >
        <div className="space-y-4">
          {noteDetails.length > 0 ? <MetadataList items={noteDetails} columns={2} /> : null}
          {mediaDetails.length > 0 || quoteDetails.length > 0 ? (
            <MetadataList items={[...mediaDetails, ...quoteDetails]} columns={2} />
          ) : null}
          <div className="space-y-3">
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
                      <p className="text-ink-soft truncate text-sm">{observation.routeHost}</p>
                      {observation.seenAt !== undefined ? (
                        <p className="text-ink-dim mt-0.5 truncate text-xs">
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
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={`/relays/${encodeURIComponent(observation.routeHost)}`}
                      className="border-edge-strong text-link inline-flex min-h-7 items-center rounded-full border px-3 text-xs"
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
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            <IdBadge id={eventId} label="event" />
            {focal?.pubkey ? <IdBadge id={focal.pubkey} label="author" /> : null}
            {typeof focal?.kind === "number" ? (
              <span className="border-edge-strong text-ink-dim inline-flex min-h-6 items-center rounded-full border px-2">
                kind {focal.kind}
              </span>
            ) : null}
          </div>
        </div>
      </Disclosure>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: canonical event" data={eventPayload ?? {}} />
        <DebugDisclosure title="Debug payload: note summary" data={noteSummary ?? {}} />
        <DebugDisclosure title="Debug payload: event counts" data={eventCountsPayload ?? {}} />
        <DebugDisclosure title="Debug payload: event seen-on" data={eventSeenOnPayload ?? {}} />
      </div>
    </div>
  );
}
