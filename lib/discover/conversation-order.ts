import type { EventRecord } from "@/lib/types/api";

const CASHTAG = /\$[A-Za-z]{1,6}\b/g;

/** A ticker tape is a cashtag dump, not a conversation to read first. */
export function isTickerTape(content: string): boolean {
  const cashtags = content.match(CASHTAG) ?? [];
  if (cashtags.length >= 8) return true;
  const tokens = content.split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0 || cashtags.length < 4) return false;
  return cashtags.length / tokens.length >= 0.45;
}

/**
 * Keep the server's relative order, but do not open the list on a ticker tape
 * when a readable thread is on the same page.
 */
export function presentConversations(notes: EventRecord[]): EventRecord[] {
  const readable: EventRecord[] = [];
  const tapes: EventRecord[] = [];
  for (const note of notes) {
    const content = typeof note.content === "string" ? note.content : "";
    if (isTickerTape(content)) tapes.push(note);
    else readable.push(note);
  }
  if (readable.length === 0) return notes;
  return [...readable, ...tapes];
}
