import { EventReadingSurface } from "@/components/explorer/event-reading-surface";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import type { EventRecord, Profile } from "@/lib/types/api";

const ROLE_LABEL: Record<"ancestor" | "focal" | "reply", string> = {
  ancestor: "Ancestor in thread",
  focal: "Focal note",
  reply: "Reply in thread",
};

export function ThreadNode({
  note,
  author,
  role,
  contentResolution,
}: {
  note: EventRecord;
  author?: Profile;
  role: "ancestor" | "focal" | "reply";
  contentResolution?: NoteContentResolution;
}) {
  return (
    <article
      aria-label={ROLE_LABEL[role]}
      className={role === "focal" ? "border-accent-soft border-l-2 pl-3" : ""}
    >
      <p className="text-ink-faint mb-2 text-xs">{role}</p>
      <EventReadingSurface event={note} author={author} contentResolution={contentResolution} />
    </article>
  );
}
