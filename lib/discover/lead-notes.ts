import type { EventRecord } from "@/lib/types/api";

function noteKey(note: EventRecord | undefined): string | null {
  if (!note) return null;
  const candidate = note.id ?? note.event_id ?? note.eventId;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function authorKey(note: EventRecord | undefined): string {
  return typeof note?.pubkey === "string" ? note.pubkey.toLowerCase() : "";
}

/**
 * Notes beside the lead. The lead author does not also occupy the next rows;
 * later notes from other people fill the column.
 */
export function selectSupportingNotes(notes: EventRecord[], limit = 3): EventRecord[] {
  const [lead, ...rest] = notes;
  if (!lead) return [];
  const leadId = noteKey(lead);
  const leadAuthor = authorKey(lead);
  const selected: EventRecord[] = [];
  for (const note of rest) {
    if (selected.length >= limit) break;
    const id = noteKey(note);
    if (leadId && id === leadId) continue;
    if (leadAuthor && authorKey(note) === leadAuthor) continue;
    selected.push(note);
  }
  return selected;
}
