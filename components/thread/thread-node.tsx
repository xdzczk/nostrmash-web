import { NoteCard } from "@/components/explorer/note-card";
import type { EventRecord } from "@/lib/types/api";

export function ThreadNode({
  note,
  role,
}: {
  note: EventRecord;
  role: "ancestor" | "focal" | "reply";
}) {
  return (
    <div className={role === "focal" ? "border-l-2 border-indigo-400 pl-3" : ""}>
      <p className="mb-2 text-xs tracking-wide text-zinc-500 uppercase">{role}</p>
      <NoteCard note={note} showFullContent={role === "focal"} />
    </div>
  );
}
