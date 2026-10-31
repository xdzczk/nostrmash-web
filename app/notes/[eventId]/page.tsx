import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { loadRepostRollup } from "@/app/notes/[eventId]/actions";
import { EntityActions } from "@/components/actions/entity-actions";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EntityContextNav } from "@/components/discover/entity-context-nav";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { MetadataList } from "@/components/explorer/metadata-list";
import { getArticlePresentation, isLongFormEvent } from "@/components/explorer/article-meta";
import { EventReadingSurface } from "@/components/explorer/event-reading-surface";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { ProfileCard } from "@/components/explorer/profile-card";
import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  applyEngagementStats,
  buildMetadataEntries,
  postEngagementStats,
  isRecord,
  profileLabel,
} from "@/components/explorer/utils";
import {
  DeferredNoteAncestors,
  DeferredNoteRelated,
  DeferredNoteThread,
} from "@/components/notes/deferred-note-sections";
import { EventComments } from "@/components/notes/event-comments";
import { EventReports } from "@/components/notes/event-reports";
import { RepostRollup } from "@/components/notes/repost-rollup";
import { JsonLd } from "@/components/seo/json-ld";
import { Disclosure } from "@/components/ui/disclosure";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { isHiddenNoteKind } from "@/lib/api/normalize";
import { encodeNevent, hexToNote } from "@/lib/nostr/nip19";
import { noteKindLabel } from "@/lib/notes/kinds";
import { isRepostEvent } from "@/lib/notes/repost";
import { liveActivityNaddr } from "@/lib/notes/live-activity";
import { addressableMediaNaddr } from "@/lib/notes/media-event";
import { getNoteSummaryCached, loadNoteFocalData } from "@/lib/notes/load-note-page-data";
import { referencedNoteIds } from "@/lib/notes/referenced-notes";
import { summarizeNoteText } from "@/lib/notes/summary-text";
import { resolveReplyParent } from "@/lib/notes/thread-tree";
import { isValidEventIdParam, resolveEventIdParam } from "@/lib/routing/params";
import { absoluteUrl, buildEntityMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ eventId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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

/** Provenance hides empty booleans and zero counts ("Has image: no"). */
function isProvenanceValue(value: unknown): boolean {
  if (!hasInformativeValue(value)) return false;
  if (value === false || value === 0) return false;
  if (typeof value === "string" && /^(no|false|0)$/i.test(value.trim())) return false;
  if (isRecord(value) || Array.isArray(value)) return false;
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
    const repost = note ? isRepostEvent(note) : false;
    const isReply =
      !repost &&
      (typeof threadContext.parent_event_id === "string" ||
        (typeof threadContext.root_event_id === "string" &&
          threadContext.root_event_id !== resolvedId) ||
        (note ? Boolean(resolveReplyParent(note)) : false));
    const kindLabel = repost ? "Repost" : isReply ? "Reply" : "Note";
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

  const countsRecord = isRecord(noteSummary?.counts)
    ? noteSummary.counts
    : isRecord(eventCountsPayload?.counts)
      ? eventCountsPayload.counts
      : isRecord(eventCountsPayload)
        ? eventCountsPayload
        : {};
  const countStats = postEngagementStats(
    countsRecord,
    isRecord(noteSummary?.summary) ? noteSummary.summary : {},
    focal
  );
  const replyCount = (() => {
    const stat = countStats.find((entry) => /^repl/i.test(entry.label));
    const value = Number(stat?.value);
    return Number.isFinite(value) ? value : undefined;
  })();
  // Summary counts are the index totals. The event's own fields are only a fallback,
  // so the card and the replies heading can't disagree.
  const focalForStats = focal ? { ...focal } : null;
  if (focalForStats) {
    delete focalForStats.reply_count;
    delete focalForStats.reaction_count;
    delete focalForStats.repost_count;
    delete focalForStats.quote_count;
    delete focalForStats.zap_count;
    delete focalForStats.zap_msats;
  }
  const focalWithEngagement = focalForStats
    ? applyEngagementStats(
        focalForStats,
        countsRecord,
        isRecord(noteSummary?.summary) ? noteSummary.summary : {},
        focal
      )
    : null;
  const provenanceDetails = buildMetadataEntries(
    {
      consistency: semantics.consistency,
      trust_mode: semantics.trust_mode,
      trust_applied: semantics.trust_applied,
    },
    ["consistency", "trust_mode", "trust_applied"]
  ).filter((entry) => isProvenanceValue(entry.value));
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
  const referenceIds = referencedNoteIds(focal, noteSummary?.quote_repost_context, eventId);
  const noteBech32 =
    (focal ? (addressableMediaNaddr(focal) ?? liveActivityNaddr(focal)) : null) ??
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
  const repostStat = countStats.find((entry) => entry.label === "repost_count");
  const repostCount = Number(repostStat?.value);
  const repostsControl =
    Number.isFinite(repostCount) && repostCount > 0 ? (
      <RepostRollup
        count={repostCount}
        quoteCount={repostStat?.quoteCount}
        load={loadRepostRollup.bind(null, eventId, repostCount)}
      />
    ) : undefined;

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
      <div className="lg:grid lg:grid-cols-[minmax(0,68ch)_minmax(16rem,20rem)] lg:items-start lg:gap-x-10">
        <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
          <EntityContextNav view="notes" />
          {isReplyNote && rootEventId && rootEventId !== eventId && !articlePresentation ? (
            <p className="mt-3 mb-1 text-sm">
              <Link
                href={`/notes/${encodeURIComponent(rootEventId)}`}
                className="text-ink-dim hover:text-ink inline-flex min-h-6 items-center"
              >
                Reply in a conversation
              </Link>
            </p>
          ) : null}

          {errorMessage ? (
            focal ? (
              <SoftRefreshNote message={errorMessage} />
            ) : (
              <ErrorPanel message={errorMessage} />
            )
          ) : null}

          <div id="conversation-context" className="mt-3">
            <div className="space-y-2">
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
                    repostsControl={repostsControl}
                  />
                  <EntityActions
                    kind="note"
                    compact
                    absoluteUrl={noteAbsoluteUrl}
                    identifier={noteBech32}
                    nostrUri={`nostr:${noteBech32}`}
                    njumpUrl={`https://njump.me/${noteBech32}`}
                    embedHtml={embedHtml}
                  />
                </article>
              ) : (
                <EmptyState message="No focal note payload was returned." />
              )}

              <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
                <DeferredNoteThread
                  eventId={eventId}
                  rootEventId={rootEventId ?? eventId}
                  searchParams={resolvedSearchParams}
                  replyCount={replyCount}
                />
              </Suspense>
              <Suspense fallback={null}>
                <EventComments eventId={eventId} />
              </Suspense>
              <Suspense fallback={null}>
                <EventReports eventId={eventId} />
              </Suspense>
            </div>
          </div>
        </div>

        {resolvedAuthor ? (
          <aside
            aria-label="About the author"
            className="order-2 mt-8 min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0"
          >
            <h2 className="text-ink-dim mb-3 text-xs font-medium tracking-wide uppercase">
              Author
            </h2>
            <ProfileCard
              profile={resolvedAuthor}
              summary={isRecord(noteSummary?.author) ? noteSummary.author : undefined}
            />
          </aside>
        ) : null}

        <div className="order-3 min-w-0 lg:col-start-1 lg:row-start-2">
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
              {typeof focal?.created_at === "number" || typeof focal?.kind === "number" ? (
                <dl className="bg-surface-sunken/30 grid gap-3 rounded-xl p-4 sm:grid-cols-2">
                  {typeof focal?.created_at === "number" ? (
                    <div className="space-y-1">
                      <dt className="text-ink-dim text-xs">Created</dt>
                      <dd className="text-ink-soft text-sm">
                        <Timestamp unixSeconds={focal.created_at} />
                      </dd>
                    </div>
                  ) : null}
                  {typeof focal?.kind === "number" ? (
                    <div className="space-y-1">
                      <dt className="text-ink-dim text-xs">Kind</dt>
                      <dd className="text-ink-soft text-sm">{noteKindLabel(focal.kind)}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              {referenceIds.length > 0 ? (
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                  {referenceIds.map((id) => (
                    <li key={id}>
                      <Link
                        href={`/notes/${encodeURIComponent(id)}`}
                        title={id}
                        className="text-link hover:text-link-hover inline-flex min-h-7 items-center text-sm"
                      >
                        Note {id.slice(0, 8)}…
                      </Link>
                    </li>
                  ))}
                </ul>
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
                    {noteKindLabel(focal.kind)}
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
      </div>
    </div>
  );
}
