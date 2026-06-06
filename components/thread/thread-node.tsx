import { NoteCard } from "@/components/explorer/note-card";
import type { EventRecord, Profile } from "@/lib/types/api";

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
    <div className={role === "focal" ? "border-accent-soft border-l-2 pl-3" : ""}>
      <p className="text-ink-faint mb-2 text-xs">{role}</p>
      <NoteCard note={note} author={author} showFullContent={role === "focal"} />
    </div>
  );
}
