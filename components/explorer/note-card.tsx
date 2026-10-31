import type { ReactNode } from "react";
import Link from "next/link";

import {
  NoteContent,
  type NoteContentResolution,
  type NoteContentSize,
} from "@/components/explorer/note-content";
import { NoteLinkPreviews } from "@/components/explorer/note-link-previews";
import { NoteMedia, type NoteMediaVariant } from "@/components/explorer/note-media";
import { extractNoteMediaAttachments } from "@/lib/notes/media";
import { getNotePreviewPresentation } from "@/components/explorer/note-preview";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  CardHitTarget,
  cardHitTargetClassName,
  cardTierClassName,
  DiscoveryActionLinks,
} from "@/components/explorer/card-grammar";
import { PostEngagement } from "@/components/explorer/post-engagement";
import { TopZap } from "@/components/explorer/top-zap";
import { mapNoteWhyNow, WhyNow } from "@/components/explorer/why-now";
import {
  postEngagementStats,
  formatProfileSecondary,
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
import { collapsePreviewWhitespace } from "@/lib/notes/summary-text";
import { isRepostEvent } from "@/lib/notes/repost";
import { tokenizeNoteContent } from "@/lib/notes/tokenize";
import type { EventRecord, Profile } from "@/lib/types/api";

import { RepostCard } from "./repost-card";

/**
 * - `list`: clamped preview with action links (trending, search, profiles).
 * - `detail`: the focal note on its own page — prose type, no action links.
 * - `reply`: a thread participant — full content, timestamp is the permalink,
 *   chip rows hidden. Engagement still shows reply, repost, reaction, and zap.
 */
export type NoteCardDensity = "list" | "detail" | "reply";

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
  repostsControl,
  conversation = false,
  showAuthor = true,
  showUtilityLinks = true,
  mediaVariant,
  suppressEmbeds = false,
  connectAbove = false,
  connectBelow = false,
  bridgeToNote = false,
  highlightTerms,
  contentSize,
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
  /** Replaces the Reposts stat on the focal note with an expandable rollup. */
  repostsControl?: ReactNode;
  /** Same stat row as every other post, plus one link into the thread. */
  conversation?: boolean;
  /** Hide the author row. Profile activity already names the subject. */
  showAuthor?: boolean;
  /** Open note / Inspect thread / Seen on relays. The card hit target stays. */
  showUtilityLinks?: boolean;
  mediaVariant?: NoteMediaVariant;
  /** Profile dossier: no link-unfurl cards, domain chips, or relay chips. */
  suppressEmbeds?: boolean;
  /** Continue a thread line down from the note above. */
  connectAbove?: boolean;
  /** Draw the line through this note's avatar gutter, beside its text. */
  connectBelow?: boolean;
  /** Carry that line across the gap to the open note's avatar. */
  bridgeToNote?: boolean;
  /** Query terms to mark inside the note text. */
  highlightTerms?: string[];
  /** Profile lists read at 16px. Discover cards keep the compact list size. */
  contentSize?: NoteContentSize;
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
      repostsControl={repostsControl}
      conversation={conversation}
      showAuthor={showAuthor}
      showUtilityLinks={showUtilityLinks}
      mediaVariant={mediaVariant}
      suppressEmbeds={suppressEmbeds}
      connectAbove={connectAbove}
      connectBelow={connectBelow}
      bridgeToNote={bridgeToNote}
      highlightTerms={highlightTerms}
      contentSize={contentSize}
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
  repostsControl,
  conversation,
  showAuthor,
  showUtilityLinks,
  mediaVariant: mediaVariantProp,
  suppressEmbeds,
  connectAbove,
  connectBelow,
  bridgeToNote,
  highlightTerms,
  contentSize: contentSizeProp,
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
  repostsControl?: ReactNode;
  conversation: boolean;
  showAuthor: boolean;
  showUtilityLinks: boolean;
  mediaVariant?: NoteMediaVariant;
  suppressEmbeds: boolean;
  connectAbove: boolean;
  connectBelow: boolean;
  bridgeToNote: boolean;
  highlightTerms?: string[];
  contentSize?: NoteContentSize;
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
  const cardHref = noteHref && (isReply || !showFullContent) ? noteHref : undefined;
  const authorLabel = resolvedAuthor ? profileLabel(resolvedAuthor) : noteAuthorIdentifier(note);
  const authorSecondaryRaw = resolvedAuthor
    ? profileSecondaryLabel(resolvedAuthor)
    : noteAuthorIdentifier(note);
  const authorSecondaryLabel = authorSecondaryRaw
    ? presentAuthorSecondary(authorSecondaryRaw)
    : null;
  const authorAvatarProfile =
    resolvedAuthor ??
    (typeof note.pubkey === "string" && note.pubkey.length > 0 ? { pubkey: note.pubkey } : null);
  const authorHref = profileHref(
    resolvedAuthor,
    typeof note.pubkey === "string" ? note.pubkey : undefined
  );
  const rawContent = typeof note.content === "string" ? note.content : "";
  const content =
    rawContent.length > 0
      ? showFullContent
        ? rawContent
        : collapsePreviewWhitespace(rawContent)
      : "(no content)";
  const preview = getNotePreviewPresentation(note);
  const linkPreviewLimit = showFullContent ? 2 : 1;
  const linkPreviewUrls =
    !suppressEmbeds && !showFullContent && typeof note.content === "string"
      ? extractNoteLinkUrls(note.content, linkPreviewLimit)
      : [];
  const clampClassName = showFullContent
    ? "overflow-visible whitespace-pre-wrap [display:block] [line-clamp:unset] [-webkit-line-clamp:unset]"
    : "line-clamp-2";
  const mediaVariant =
    mediaVariantProp ??
    (isDetail
      ? "detail"
      : isReply
        ? "thread"
        : !showFullContent && density === "list"
          ? "compact"
          : undefined);
  const metrics = postEngagementStats(note);
  const replyCount = metrics.find((stat) => stat.label === "reply_count")?.value ?? 0;
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
  const listThumb =
    !showFullContent &&
    density === "list" &&
    mediaVariant === "compact" &&
    extractNoteMediaAttachments(rawContent).length > 0;
  const rankLabel = typeof rank === "number" ? String(rank).padStart(2, "0") : null;
  const contentSize = contentSizeProp ?? (isDetail ? "detail" : isReply ? "reply" : "list");
  const metaTextClass = density === "list" ? "text-xs" : "text-[13px]";
  const chipRowClass = `text-ink-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 ${metaTextClass}`;
  const chipLinkClass = "inline-flex min-h-6 items-center";
  const chained = connectAbove || connectBelow;
  const surfaceClass = isDetail
    ? "px-0 py-0"
    : isReply
      ? `border-b border-edge/60 bg-transparent py-4 last:border-b-0 ${chained ? "px-0" : "px-1 sm:px-2"}`
      : cardTierClassName("standard");
  const timestamp = <Timestamp unixSeconds={note.created_at} />;

  return (
    <article
      className={`group ${surfaceClass} ${
        density === "list" ? (isTopRank ? "border-accent-soft/40" : "border-edge/70") : ""
      } ${chained ? "relative" : ""} ${cardHref ? cardHitTargetClassName : ""}`}
    >
      <div className="flex items-start gap-3">
        {rankLabel ? (
          <span className="text-accent-ink w-7 shrink-0 pt-2 text-lg leading-none tracking-[-0.05em] tabular-nums">
            {rankLabel}
          </span>
        ) : null}
        {showAuthor && authorAvatarProfile ? (
          <ProfileAvatar
            profile={authorAvatarProfile}
            size={44}
            alt={authorLabel}
            href={authorHref}
            className="border-edge-strong h-10 w-10 rounded-full border object-cover sm:h-11 sm:w-11"
          />
        ) : showAuthor && authorHref ? (
          <Link
            href={authorHref}
            aria-label={`View ${authorLabel}`}
            className="bg-surface-sunken/70 text-ink-faint hover:text-ink flex h-10 w-10 items-center justify-center rounded-full text-xs sm:h-11 sm:w-11"
          >
            {authorLabel.slice(0, 1).toUpperCase() || "?"}
          </Link>
        ) : showAuthor ? (
          <div
            aria-hidden
            className="bg-surface-sunken/70 text-ink-faint flex h-10 w-10 items-center justify-center rounded-full text-xs sm:h-11 sm:w-11"
          >
            {authorLabel.slice(0, 1).toUpperCase() || "?"}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${metaTextClass}`}>
            {showAuthor && authorHref ? (
              isDetail ? (
                <h1 className="m-0 inline max-w-[min(100%,16rem)] truncate text-[13px] leading-5 font-medium">
                  <Link
                    href={authorHref}
                    title={authorLabel}
                    className={`text-ink-soft hover:text-ink-strong ${chipLinkClass} font-medium hover:underline`}
                  >
                    {truncateProfileLabel(authorLabel)}
                  </Link>
                </h1>
              ) : (
                <Link
                  href={authorHref}
                  title={authorLabel}
                  className={`text-ink-soft hover:text-ink-strong ${chipLinkClass} max-w-[min(100%,16rem)] truncate font-medium hover:underline`}
                >
                  {truncateProfileLabel(authorLabel)}
                </Link>
              )
            ) : showAuthor ? (
              <span
                className="text-ink-soft inline-block max-w-[min(100%,16rem)] truncate font-medium"
                title={authorLabel}
              >
                {truncateProfileLabel(authorLabel)}
              </span>
            ) : null}
            {showAuthor && authorSecondaryLabel && authorHref ? (
              <Link
                href={authorHref}
                className={`${density === "list" ? "text-ink-faint" : "text-ink-dim"} hover:text-ink-muted ${chipLinkClass}`}
                title={authorSecondaryRaw ?? undefined}
              >
                {authorSecondaryLabel}
              </Link>
            ) : showAuthor && authorSecondaryLabel ? (
              <span
                className={density === "list" ? "text-ink-faint" : "text-ink-dim"}
                title={authorSecondaryRaw ?? undefined}
              >
                {authorSecondaryLabel}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              {showAuthor ? (
                <span aria-hidden className="text-ink-faint/70">
                  •
                </span>
              ) : null}
              {isReply && noteHref ? (
                <Link
                  href={noteHref}
                  className={`${chipLinkClass} hover:text-ink rounded-sm hover:underline`}
                >
                  <span className="sr-only">{`Open reply by ${authorLabel} `}</span>
                  {timestamp}
                </Link>
              ) : (
                timestamp
              )}
            </span>
          </div>
        </div>
      </div>

      {connectAbove ? (
        <span
          data-thread-stem="above"
          aria-hidden
          className="bg-ink-faint pointer-events-none absolute -top-4 left-5 h-4 w-0.5 -translate-x-1/2 sm:left-[1.375rem]"
        />
      ) : null}
      {connectBelow ? (
        <span
          data-thread-stem="below"
          aria-hidden
          className={`bg-ink-faint pointer-events-none absolute top-14 left-5 w-0.5 -translate-x-1/2 sm:top-[3.75rem] sm:left-[1.375rem] ${bridgeToNote ? "-bottom-2" : "bottom-0"}`}
        />
      ) : null}
      <div className={connectBelow ? "pl-14" : undefined}>
        {listThumb ? (
          <div className="mt-2.5 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <NoteContent
                tokens={tokenizeNoteContent(content, { tags: note.tags })}
                className={clampClassName}
                showQuotes={showFullContent}
                resolution={contentResolution}
                hideLinkPreviewUrls={linkPreviewUrls}
                size={contentSize}
                highlightTerms={highlightTerms}
              />
              {suppressEmbeds ? null : (
                <NoteLinkPreviews content={note.content ?? ""} limit={linkPreviewLimit} />
              )}
            </div>
            <NoteMedia content={note.content ?? ""} priority={priorityMedia} variant="compact" />
          </div>
        ) : (
          <>
            {preview.prefersMediaFirst &&
            typeof note.content === "string" &&
            note.content.length > 0 ? (
              <>
                <NoteMedia content={note.content} priority={priorityMedia} variant={mediaVariant} />
                {suppressEmbeds ? null : (
                  <NoteLinkPreviews content={note.content} limit={linkPreviewLimit} />
                )}
              </>
            ) : null}
            <NoteContent
              tokens={tokenizeNoteContent(content, { tags: note.tags })}
              className={`${isDetail ? "mt-4" : "mt-2.5"} ${clampClassName}`}
              showQuotes={showFullContent}
              resolution={contentResolution}
              hideLinkPreviewUrls={linkPreviewUrls}
              size={contentSize}
              highlightTerms={highlightTerms}
            />
            {!preview.prefersMediaFirst &&
            typeof note.content === "string" &&
            note.content.length > 0 ? (
              <>
                <NoteMedia content={note.content} priority={priorityMedia} variant={mediaVariant} />
                {suppressEmbeds ? null : (
                  <NoteLinkPreviews content={note.content} limit={linkPreviewLimit} />
                )}
              </>
            ) : null}
          </>
        )}

        {!suppressEmbeds && noteDomains.length > 0 ? (
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
                  className={`text-ink-dim hover:text-ink whitespace-nowrap transition ${chipLinkClass}`}
                >
                  {`#${hashtag}`}
                </Link>
              </span>
            ))}
          </div>
        ) : null}

        {!suppressEmbeds && relayHosts.length > 0 ? (
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
                  className={`hover:text-link-hover text-ink-dim whitespace-nowrap transition ${chipLinkClass}`}
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

        <PostEngagement
          stats={metrics}
          className={isDetail ? "mt-4" : "mt-2.5 sm:mt-3"}
          size={isDetail ? "md" : "sm"}
          replacements={isDetail && repostsControl ? { repost_count: repostsControl } : undefined}
        />
        <TopZap source={note} size={isDetail ? "md" : "sm"} />

        {conversation && replyCount > 0 && resolvedNoteId ? (
          <Link
            href={`/notes/${encodeURIComponent(resolvedNoteId)}#conversation-context`}
            className="nm-action-link mt-1 inline-flex min-h-11 items-center text-sm"
          >
            Thread
          </Link>
        ) : null}

        {showUtilityLinks && resolvedNoteId && density === "list" && !cardHref ? (
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
        {cardHref ? (
          <CardHitTarget
            href={cardHref}
            label={isReply ? `Open reply by ${authorLabel}` : `Open note by ${authorLabel}`}
          />
        ) : null}
      </div>
    </article>
  );
}

function presentAuthorSecondary(value: string): string | null {
  if (/^(npub1|nprofile1)/i.test(value) || /^[0-9a-f]{32,}$/i.test(value)) {
    return truncateIdentifier(
      value,
      value.toLowerCase().startsWith("npub") ? "npub" : "pubkey",
      "secondary"
    );
  }
  const formatted = formatProfileSecondary(value);
  return formatted.length > 0 ? formatted : null;
}
