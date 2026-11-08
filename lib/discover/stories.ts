import { extractHashtagsFromNote } from "@/components/explorer/utils";
import type { EventRecord } from "@/lib/types/api";

function noteAuthor(note: EventRecord): string {
  return typeof note.pubkey === "string" ? note.pubkey.toLowerCase() : "";
}

/**
 * Notes in the current ranking that share a hashtag. The label is that tag,
 * not a generated story title.
 */
export function sharedTopicLine(notes: EventRecord[]): string | null {
  const tagged = notes
    .map((note) => ({
      author: noteAuthor(note),
      tags: extractHashtagsFromNote(note, 12),
    }))
    .filter((note) => note.tags.length > 0);
  if (tagged.length < 2) return null;

  const counts = new Map<string, { notes: number; authors: Set<string> }>();
  for (const note of tagged) {
    for (const tag of new Set(note.tags)) {
      const current = counts.get(tag) ?? { notes: 0, authors: new Set<string>() };
      current.notes += 1;
      if (note.author) current.authors.add(note.author);
      counts.set(tag, current);
    }
  }

  let best: { tag: string; notes: number; authors: number } | null = null;
  for (const [tag, value] of counts) {
    if (value.notes < 2) continue;
    if (!best || value.notes > best.notes) {
      best = { tag, notes: value.notes, authors: value.authors.size };
    }
  }
  if (!best) return null;
  const others = best.notes - 1;
  const noteWord = others === 1 ? "note" : "notes";
  const authorCount = best.authors > 0 ? best.authors : others;
  const people = authorCount === 1 ? "person" : "people";
  return `${others} other ${noteWord} from ${authorCount} ${people} in this ranking also use #${best.tag}.`;
}
