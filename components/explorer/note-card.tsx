import Link from "next/link";

import { NoteContent, type NoteContentResolution } from "@/components/explorer/note-content";
import { NoteLinkPreviews } from "@/components/explorer/note-link-previews";
import { NoteMedia } from "@/components/explorer/note-media";
import { getNotePreviewPresentation } from "@/components/explorer/note-preview";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  CardHitTarget,
  cardHitTargetClassName,
  cardTierClassName,
  DiscoveryActionLinks,
  DiscoveryStatPills,
} from "@/components/explorer/card-grammar";
import { mapNoteWhyNow, WhyNow } from "@/components/explorer/why-now";
import {
  extractEngagementStats,
  normalizeDomainLabel,
  noteInlineAuthorProfile,
  noteAuthorIdentifier,
  profileHref,
  profileLabel,
  profileSecondaryLabel,
  extractDomainsFromNote,
  extractHashtagsFromNote,
  extractRelayHostsFromNote,
  truncateIdentifier,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import { extractNoteLinkUrls } from "@/lib/notes/links";
import { isRepostEvent } from "@/lib/notes/repost";
import { tokenizeNoteContent } from "@/lib/notes/tokenize";
import type { EventRecord, Profile } from "@/lib/types/api";

import { RepostCard } from "./repost-card";

/**
 * - `list`: clamped preview with action links (trending, search, profiles).
 * - `detail`: the focal note on its own page — prose type, no action links.
 * - `reply`: a thread participant — full content, timestamp is the permalink,
 *   zero-valued stats and chip rows hidden.
 */
export type NoteCardDensity = "list" | "detail" | "reply";

function isNonZeroStat(stat: { value: unknown }): boolean {
  if (typeof stat.value === "number") return stat.value > 0;
  if (typeof stat.value === "string") return stat.value.trim() !== "" && stat.value !== "0";
  return stat.value !== null && stat.value !== undefined;
}

export function NoteCard({
  note,
  author,
  href,
  rank,
  showFullContent,
  discoverySignals = false,
  contentResolution,
  density = "list",
  priorityMedia = false,
  contextEventId,
}: {
  note: EventRecord;
  author?: Profile;
  href?: string;
  rank?: number;
  showFullContent?: boolean;
  discoverySignals?: boolean;
  contentResolution?: NoteContentResolution;
  density?: NoteCardDensity;
  /** Eager-load the first image (LCP candidate on the detail page). */
  priorityMedia?: boolean;
  /** Note the surrounding page is about; reposts of it render as one line. */
  contextEventId?: string;
}) {
  if (isRepostEvent(note)) {
    return (
      <RepostCard
        repost={note}
        author={author}
        href={href}
        density={density}
        contentResolution={contentResolution}
        contextEventId={contextEventId}
      />
    );
  }
  return (
    <NoteCardBody
      note={note}
      author={author}
      href={href}
      rank={rank}
      showFullContent={showFullContent ?? density !== "list"}
      discoverySignals={discoverySignals}
      contentResolution={contentResolution}
      density={density}
      priorityMedia={priorityMedia}
    />
  );
}

function NoteCardBody({
  note,
  author,
  href,
  rank,
  showFullContent,
  discoverySignals,
  contentResolution,
  density,
  priorityMedia,
}: {
  note: EventRecord;
  author?: Profile;
  href?: string;
  rank?: number;
  showFullContent: boolean;
  discoverySignals: boolean;
  contentResolution?: NoteContentResolution;
  density: NoteCardDensity;
  priorityMedia: boolean;
}) {
  const isReply = density === "reply";
  const isDetail = density === "detail";
  const resolvedAuthor = author ?? noteInlineAuthorProfile(note);
  const resolvedNoteId =
    (typeof note.id === "string" && note.id.length > 0
      ? note.id
      : typeof note.event_id === "string" && note.event_id.length > 0
        ? note.event_id
        : typeof note.eventId === "string" && note.eventId.length > 0
          ? note.eventId
          : undefined) ?? undefined;
  const noteHref =
    href ?? (resolvedNoteId ? `/notes/${encodeURIComponent(resolvedNoteId)}` : undefined);
  const cardHref = noteHref && !showFullContent ? noteHref : undefined;
  const authorLabel = resolvedAuthor ? profileLabel(resolvedAuthor) : noteAuthorIdentifier(note);
  const authorSecondaryLabel = resolvedAuthor
    ? profileSecondaryLabel(resolvedAuthor)
    : noteAuthorIdentifier(note);
  const authorAvatarProfile =
    resolvedAuthor ??
    (typeof note.pubkey === "string" && note.pubkey.length > 0 ? { pubkey: note.pubkey } : null);
  const authorHref = profileHref(
    resolvedAuthor,
    typeof note.pubkey === "string" ? note.pubkey : undefined
  );
  const rawContent = typeof note.content === "string" ? note.content : "";
  const content = rawContent.length > 0 ? rawContent : "(no content)";
  const preview = getNotePreviewPresentation(note);
  const linkPreviewLimit = showFullContent ? 2 : 1;
  const linkPreviewUrls =
    !showFullContent && typeof note.content === "string"
      ? extractNoteLinkUrls(note.content, linkPreviewLimit)
      : [];
  const prefersCompactClamp = preview.isCompact || preview.mode === "long_identifier_heavy_preview";
  const clampClassName = showFullContent
    ? "overflow-visible whitespace-pre-wrap [display:block] [line-clamp:unset] [-webkit-line-clamp:unset]"
    : prefersCompactClamp
      ? "line-clamp-2"
      : "line-clamp-4";
  const allMetrics = extractEngagementStats(note);
  const metrics = isReply ? allMetrics.filter(isNonZeroStat) : allMetrics;
  const isTopRank = typeof rank === "number" && rank <= 3;
  const noteDomains = isReply
    ? []
    : extractDomainsFromNote(note, 2).map((domain) => ({
        raw: domain,
        label: truncateIdentifier(normalizeDomainLabel(domain), "domain", "primary"),
      }));
  const noteHashtags = isReply ? [] : extractHashtagsFromNote(note, 2);
  const relayHosts = isReply
    ? []
    : extractRelayHostsFromNote(note, 2).map((relayHost) => ({
        raw: relayHost,
        label: truncateIdentifier(relayHost, "relay", "primary"),
      }));
  const reasonCandidates = mapNoteWhyNow(note);
  const rankLabel = typeof rank === "number" ? String(rank).padStart(2, "0") : null;
  const contentSize = isDetail ? "detail" : isReply ? "reply" : "list";
  const metaTextClass = density === "list" ? "text-xs" : "text-[13px]";
  const chipRowClass = `text-ink-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 ${metaTextClass}`;
  const chipLinkClass = "inline-flex min-h-6 items-center";
  const surfaceClass = isDetail
    ? "px-0 py-0"
    : isReply
      ? "border-b border-edge/60 bg-transparent px-1 py-4 last:border-b-0 sm:px-2"
      : cardTierClassName("standard");
  const timestamp = <Timestamp unixSeconds={note.created_at} />;

  return (
    <article
      className={`group ${surfaceClass} ${
        density === "list" ? (isTopRank ? "border-accent-soft/40" : "border-edge/70") : ""
      } ${cardHref ? cardHitTargetClassName : ""}`}
    >
      <div className="flex items-start gap-3">
        {rankLabel ? (
          <span className="text-accent-ink w-7 shrink-0 pt-2 text-lg leading-none tracking-[-0.05em] tabular-nums">
            {rankLabel}
          </span>
        ) : null}
        {authorAvatarProfile ? (
          <ProfileAvatar
            profile={authorAvatarProfile}
            size={44}
            alt={authorLabel}
            href={authorHref}
            className="border-edge-strong h-10 w-10 rounded-full border object-cover sm:h-11 sm:w-11"
          />
        ) : authorHref ? (
          <Link
            href={authorHref}
            aria-label={`View ${authorLabel}`}
            className="bg-surface-sunken/70 text-ink-faint hover:text-ink flex h-10 w-10 items-center justify-center rounded-full text-xs sm:h-11 sm:w-11"
          >
            {authorLabel.slice(0, 1).toUpperCase() || "?"}
          </Link>
        ) : (
          <div
            aria-hidden
            className="bg-surface-sunken/70 text-ink-faint flex h-10 w-10 items-center justify-center rounded-full text-xs sm:h-11 sm:w-11"
          >
            {authorLabel.slice(0, 1).toUpperCase() || "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${metaTextClass}`}>
            {authorHref ? (
              <Link
                href={authorHref}
                title={authorLabel}
                className={`text-ink-soft hover:text-ink-strong ${chipLinkClass} max-w-[min(100%,16rem)] truncate font-medium hover:underline`}
              >
                {truncateProfileLabel(authorLabel)}
              </Link>
            ) : (
              <span
                className="text-ink-soft inline-block max-w-[min(100%,16rem)] truncate font-medium"
                title={authorLabel}
              >
                {truncateProfileLabel(authorLabel)}
              </span>
            )}
            {authorSecondaryLabel && authorHref ? (
              <Link
                href={authorHref}
                className={`${density === "list" ? "text-ink-faint" : "text-ink-dim"} hover:text-ink-muted ${chipLinkClass}`}
                title={authorSecondaryLabel}
              >
                {truncateIdentifier(authorSecondaryLabel, "npub", "secondary")}
              </Link>
            ) : authorSecondaryLabel ? (
              <span
                className={density === "list" ? "text-ink-faint" : "text-ink-dim"}
                title={authorSecondaryLabel}
              >
                {truncateIdentifier(authorSecondaryLabel, "npub", "secondary")}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span aria-hidden className="text-ink-faint/70">
                •
              </span>
              {isReply && noteHref ? (
                <Link
                  href={noteHref}
                  className={`${chipLinkClass} hover:text-ink rounded-sm hover:underline`}
                  aria-label={`Open reply by ${authorLabel}`}
                >
                  {timestamp}
                </Link>
              ) : (
                timestamp
              )}
            </span>
          </div>
        </div>
      </div>

      {preview.prefersMediaFirst && typeof note.content === "string" && note.content.length > 0 ? (
        <>
          <NoteMedia content={note.content} priority={priorityMedia} />
          <NoteLinkPreviews content={note.content} limit={linkPreviewLimit} />
        </>
      ) : null}
      <NoteContent
        tokens={tokenizeNoteContent(content, { tags: note.tags })}
        className={`${isDetail ? "mt-4" : "mt-2.5"} ${clampClassName}`}
        showQuotes={showFullContent}
        resolution={contentResolution}
        hideLinkPreviewUrls={linkPreviewUrls}
        size={contentSize}
      />
      {!preview.prefersMediaFirst && typeof note.content === "string" && note.content.length > 0 ? (
        <>
          <NoteMedia content={note.content} priority={priorityMedia} />
          <NoteLinkPreviews content={note.content} limit={linkPreviewLimit} />
        </>
      ) : null}

      {noteDomains.length > 0 ? (
        <div className={`${chipRowClass} mt-3`}>
          <span className="text-ink-faint">Links</span>
          {noteDomains.map((domain) => (
            <span key={domain.raw} className="inline-flex items-center gap-2">
              <span aria-hidden className="text-ink-faint/70">
                •
              </span>
              <Link
                href={`/domains/${encodeURIComponent(domain.raw)}`}
                title={domain.raw}
                className={`text-ink-dim hover:text-ink transition ${chipLinkClass}`}
              >
                {domain.label}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {noteHashtags.length > 0 ? (
        <div className={chipRowClass}>
          <span className="text-ink-faint">Topics</span>
          {noteHashtags.map((hashtag) => (
            <span key={hashtag} className="inline-flex items-center gap-2">
              <span aria-hidden className="text-ink-faint/70">
                •
              </span>
              <Link
                href={`/hashtags/${encodeURIComponent(hashtag)}`}
                className={`text-ink-dim hover:text-ink transition ${chipLinkClass}`}
              >
                #{hashtag}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {relayHosts.length > 0 ? (
        <div className={chipRowClass}>
          <span className="text-ink-faint">Relays</span>
          {relayHosts.map((relayHost) => (
            <span key={relayHost.raw} className="inline-flex items-center gap-2">
              <span aria-hidden className="text-ink-faint/70">
                •
              </span>
              <Link
                href={`/relays/${encodeURIComponent(relayHost.raw)}`}
                title={relayHost.raw}
                className={`hover:text-link-hover text-ink-dim transition ${chipLinkClass}`}
              >
                {relayHost.label}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {discoverySignals ? (
        <WhyNow reasons={reasonCandidates} showLabel={false} className="mt-2.5 sm:mt-3" />
      ) : null}

      <DiscoveryStatPills
        stats={metrics}
        className={isDetail ? "mt-4" : "mt-2.5 sm:mt-3"}
        size={isDetail ? "md" : "sm"}
      />

      {resolvedNoteId && density === "list" ? (
        <div className="text-ink-muted mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:mt-3">
          <DiscoveryActionLinks
            actions={[
              { label: "Open note", href: noteHref },
              {
                label: "Inspect thread",
                href: `/notes/${encodeURIComponent(resolvedNoteId)}#conversation-context`,
              },
              {
                label: "Seen on relays",
                href: `/notes/${encodeURIComponent(resolvedNoteId)}#note-provenance`,
              },
            ]}
          />
        </div>
      ) : null}
      {cardHref ? <CardHitTarget href={cardHref} label={`Open note by ${authorLabel}`} /> : null}
    </article>
  );
}
