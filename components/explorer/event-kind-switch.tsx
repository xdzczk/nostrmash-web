import type { ReactNode } from "react";

import { ArticleCard } from "@/components/explorer/article-card";
import { ArticleReader } from "@/components/explorer/article-reader";
import { isLongFormEvent } from "@/components/explorer/article-meta";
import { GenericRepostCard } from "@/components/explorer/generic-repost-card";
import { LiveCard } from "@/components/explorer/live-card";
import { MediaCard } from "@/components/explorer/media-card";
import { NoteCard, type NoteCardDensity } from "@/components/explorer/note-card";
import type { NoteContentSize, NoteContentResolution } from "@/components/explorer/note-content";
import type { NoteMediaVariant } from "@/components/explorer/note-media";
import { isHiddenNoteKind } from "@/lib/api/normalize";
import { GENERIC_REPOST_KIND, isLiveActivityKind, isMediaKind } from "@/lib/notes/kinds";
import type { EventRecord, Profile } from "@/lib/types/api";

export type EventSurface = "list" | "detail" | "reply";

/**
 * One kind switch for feeds, search, embeds, and the note page.
 * Kind 1111 and 1984 never render here. Kind 6 keeps the note repost card.
 */
export function EventKindSwitch({
  event,
  author,
  surface = "list",
  contentResolution,
  showAuthor = true,
  showUtilityLinks = true,
  omitZeroStats = false,
  discoverySignals = false,
  rank,
  highlightTerms,
  contentSize,
  showFullContent,
  mediaVariant,
  suppressEmbeds = false,
  priorityMedia = false,
  conversation = false,
  repostsControl,
  connectAbove = false,
  connectBelow = false,
  bridgeToNote = false,
  profilesByPubkey,
  unwrapReposts = true,
}: {
  event: EventRecord;
  author?: Profile;
  surface?: EventSurface;
  contentResolution?: NoteContentResolution;
  showAuthor?: boolean;
  showUtilityLinks?: boolean;
  omitZeroStats?: boolean;
  discoverySignals?: boolean;
  rank?: number;
  highlightTerms?: string[];
  contentSize?: NoteContentSize;
  showFullContent?: boolean;
  mediaVariant?: NoteMediaVariant;
  suppressEmbeds?: boolean;
  priorityMedia?: boolean;
  conversation?: boolean;
  repostsControl?: ReactNode;
  connectAbove?: boolean;
  connectBelow?: boolean;
  bridgeToNote?: boolean;
  profilesByPubkey?: NoteContentResolution["profilesByPubkey"];
  /** Kind 16 unwraps once. The inner event does not unwrap again. */
  unwrapReposts?: boolean;
}) {
  if (isHiddenNoteKind(event)) return null;

  const density: NoteCardDensity =
    surface === "list" ? "list" : surface === "reply" ? "reply" : "detail";

  if (isMediaKind(event.kind)) {
    return (
      <MediaCard
        event={event}
        author={author}
        surface={surface}
        showAuthor={showAuthor}
        showUtilityLinks={showUtilityLinks}
        omitZeroStats={omitZeroStats}
        rank={rank}
        contentResolution={contentResolution}
        highlightTerms={highlightTerms}
        priority={priorityMedia}
      />
    );
  }

  if (isLiveActivityKind(event.kind)) {
    return (
      <LiveCard
        event={event}
        author={author}
        surface={surface}
        showAuthor={showAuthor}
        profilesByPubkey={profilesByPubkey ?? contentResolution?.profilesByPubkey}
        priority={priorityMedia}
      />
    );
  }

  if (event.kind === GENERIC_REPOST_KIND && unwrapReposts) {
    return (
      <GenericRepostCard
        repost={event}
        author={author}
        contentResolution={contentResolution}
        renderEvent={(inner, innerAuthor) => (
          <EventKindSwitch
            event={inner}
            author={innerAuthor}
            surface={surface === "detail" ? "detail" : "reply"}
            contentResolution={contentResolution}
            showAuthor
            showUtilityLinks={false}
            omitZeroStats
            profilesByPubkey={profilesByPubkey}
            unwrapReposts={false}
          />
        )}
      />
    );
  }

  if (isLongFormEvent(event)) {
    if (surface === "detail") {
      return (
        <ArticleReader article={event} author={author} contentResolution={contentResolution} />
      );
    }
    return (
      <ArticleCard
        article={event}
        author={author}
        rank={rank}
        discoverySignals={discoverySignals}
        contentResolution={contentResolution}
        showAuthor={showAuthor}
        showUtilityLinks={showUtilityLinks}
        omitZeroStats={omitZeroStats}
      />
    );
  }

  return (
    <NoteCard
      note={event}
      author={author}
      rank={rank}
      showFullContent={showFullContent ?? surface !== "list"}
      discoverySignals={discoverySignals}
      contentResolution={contentResolution}
      density={density}
      priorityMedia={priorityMedia}
      repostsControl={repostsControl}
      conversation={conversation}
      showAuthor={showAuthor}
      showUtilityLinks={showUtilityLinks}
      omitZeroStats={omitZeroStats}
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
