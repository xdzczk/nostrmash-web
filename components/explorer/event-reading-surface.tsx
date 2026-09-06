import { ArticleReader } from "@/components/explorer/article-reader";
import { isLongFormEvent } from "@/components/explorer/article-meta";
import { NoteCard } from "@/components/explorer/note-card";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import type { EventRecord, Profile } from "@/lib/types/api";

/** Full reading surface: article reader for kind 30023, otherwise an unclamped note. */
export function EventReadingSurface({
  event,
  author,
  contentResolution,
}: {
  event: EventRecord;
  author?: Profile;
  contentResolution?: NoteContentResolution;
}) {
  if (isLongFormEvent(event)) {
    return <ArticleReader article={event} author={author} contentResolution={contentResolution} />;
  }

  return (
    <NoteCard note={event} author={author} showFullContent contentResolution={contentResolution} />
  );
}
