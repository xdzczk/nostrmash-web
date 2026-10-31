import Link from "next/link";

import {
  CardHitTarget,
  cardHitTargetClassName,
  cardTierClassName,
  DiscoveryActionLinks,
  DiscoveryPill,
} from "@/components/explorer/card-grammar";
import { PostEngagement } from "@/components/explorer/post-engagement";
import { EventByline } from "@/components/explorer/event-byline";
import { NoteMediaReveal } from "@/components/explorer/note-media-reveal";
import { NoteContent, type NoteContentResolution } from "@/components/explorer/note-content";
import {
  noteAuthorIdentifier,
  postEngagementStats,
  noteInlineAuthorProfile,
  profileLabel,
} from "@/components/explorer/utils";
import { eventPageHref, noteKindLabel } from "@/lib/notes/kinds";
import { getMediaPresentation } from "@/lib/notes/media-event";
import { tokenizeNoteContent } from "@/lib/notes/tokenize";
import type { EventRecord, Profile } from "@/lib/types/api";

export function MediaCard({
  event,
  author,
  surface = "list",
  showAuthor = true,
  showUtilityLinks = true,
  rank,
  contentResolution,
  highlightTerms,
  priority = false,
}: {
  event: EventRecord;
  author?: Profile;
  surface?: "list" | "detail" | "reply";
  showAuthor?: boolean;
  showUtilityLinks?: boolean;
  rank?: number;
  contentResolution?: NoteContentResolution;
  highlightTerms?: string[];
  priority?: boolean;
}) {
  const presentation = getMediaPresentation(event);
  if (!presentation) return null;

  const href = eventPageHref(event);
  const kindLabel = noteKindLabel(event.kind ?? 20);
  const resolvedAuthor = author ?? noteInlineAuthorProfile(event);
  const authorLabel = resolvedAuthor ? profileLabel(resolvedAuthor) : noteAuthorIdentifier(event);
  const isDetail = surface === "detail";
  const interactive = Boolean(href) && surface === "list";
  const rankLabel = typeof rank === "number" ? String(rank).padStart(2, "0") : null;
  const frameVariant = presentation.variant === "short" ? "portrait" : isDetail ? "detail" : "full";
  const mediaWrap =
    presentation.variant === "short" ? "mx-auto w-full max-w-[22rem]" : "w-full max-w-3xl";

  return (
    <article
      className={`group ${cardTierClassName("standard")} border-edge/70 ${
        interactive ? cardHitTargetClassName : ""
      }`}
      aria-label={`${kindLabel} by ${authorLabel}`}
      data-kind={event.kind}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {rankLabel ? (
          <span className="text-accent-ink mr-1 text-lg leading-none tracking-[-0.05em] tabular-nums">
            {rankLabel}
          </span>
        ) : null}
        <DiscoveryPill tone="neutral" className="px-2 py-0.5 tracking-wide uppercase">
          {kindLabel}
        </DiscoveryPill>
        {presentation.durationLabel ? (
          <span className="text-ink-faint tabular-nums">{presentation.durationLabel}</span>
        ) : null}
      </div>

      {presentation.title ? (
        <h3 className="text-ink mt-2 text-base leading-6 font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-lg">
          {href && !interactive ? (
            <Link href={href} className="hover:text-ink-strong">
              {presentation.title}
            </Link>
          ) : (
            presentation.title
          )}
        </h3>
      ) : null}

      {presentation.videoUrl ? (
        <div className={`mt-3 ${mediaWrap}`}>
          <NoteMediaReveal
            url={presentation.videoUrl}
            kind="video"
            variant={frameVariant}
            priority={priority}
            poster={presentation.posterUrl}
            alt={presentation.title ?? kindLabel}
          />
        </div>
      ) : null}

      {presentation.images.length > 0 &&
      (presentation.variant === "picture" || !presentation.videoUrl) ? (
        <div
          className={`mt-3 grid gap-3 ${
            presentation.images.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
          } ${presentation.variant === "picture" ? "" : "max-w-xs"}`}
        >
          {presentation.images.map((image, index) => (
            <NoteMediaReveal
              key={image.url}
              url={image.url}
              kind="image"
              variant={frameVariant}
              priority={priority && index === 0}
              alt={image.alt ?? presentation.title ?? kindLabel}
            />
          ))}
        </div>
      ) : null}

      {presentation.text.length > 0 ? (
        <NoteContent
          tokens={tokenizeNoteContent(presentation.text, { tags: event.tags })}
          className={`text-ink mt-3 text-sm leading-6 break-words whitespace-pre-wrap ${
            isDetail ? "" : "line-clamp-4"
          }`}
          showQuotes={isDetail}
          resolution={contentResolution}
          highlightTerms={highlightTerms}
        />
      ) : null}

      <div className="mt-3">
        <EventByline
          event={event}
          author={author}
          showAuthor={showAuthor}
          timestamp={presentation.publishedAt ?? event.created_at}
        />
      </div>

      <PostEngagement
        stats={postEngagementStats(event)}
        className="mt-2.5 sm:mt-3"
        size={isDetail ? "md" : "sm"}
      />

      {showUtilityLinks && href && surface === "list" ? (
        <div className="text-ink-muted mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:mt-3">
          <DiscoveryActionLinks
            actions={[
              { label: `Open ${kindLabel.toLowerCase()}`, href },
              { label: "Seen on relays", href: `${href}#note-provenance` },
            ]}
          />
        </div>
      ) : null}
      {interactive && href ? (
        <CardHitTarget href={href} label={`Open ${kindLabel.toLowerCase()} by ${authorLabel}`} />
      ) : null}
    </article>
  );
}
