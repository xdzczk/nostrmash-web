import { NoteCard } from "@/components/explorer/note-card";
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
}: {
  note: EventRecord;
  author?: Profile;
  role: "ancestor" | "focal" | "reply";
}) {
  return (
    <article
      aria-label={ROLE_LABEL[role]}
      className={role === "focal" ? "border-accent-soft border-l-2 pl-3" : ""}
    >
      <p className="text-ink-faint mb-2 text-xs">{role}</p>
      <NoteCard note={note} author={author} showFullContent={role === "focal"} />
    </article>
  );
}
