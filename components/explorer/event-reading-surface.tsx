import type { ReactNode } from "react";

import { ArticleReader } from "@/components/explorer/article-reader";
import { isLongFormEvent } from "@/components/explorer/article-meta";
import { NoteCard, type NoteCardDensity } from "@/components/explorer/note-card";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import type { EventRecord, Profile } from "@/lib/types/api";

/** Full reading surface: article reader for kind 30023, otherwise an unclamped note. */
export function EventReadingSurface({
  event,
  author,
  contentResolution,
  density = "detail",
  priorityMedia = false,
  repostsControl,
}: {
  event: EventRecord;
  author?: Profile;
  contentResolution?: NoteContentResolution;
  density?: Exclude<NoteCardDensity, "list">;
  priorityMedia?: boolean;
  /** Replaces the Reposts stat on the focal note. */
  repostsControl?: ReactNode;
}) {
  if (isLongFormEvent(event)) {
    return <ArticleReader article={event} author={author} contentResolution={contentResolution} />;
  }

  return (
    <NoteCard
      note={event}
      author={author}
      showFullContent
      density={density}
      priorityMedia={priorityMedia}
      contentResolution={contentResolution}
      repostsControl={repostsControl}
    />
  );
}
