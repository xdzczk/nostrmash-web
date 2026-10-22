import type { EventRecord } from "@/lib/types/api";
import { isRepostEvent, parseRepostTarget } from "@/lib/notes/repost";

export function relatedReasons(note: EventRecord): string[] {
  const raw = note.reasons;
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

/**
 * Reposts of the focal note collapse into one attribution line. Everything
 * else — quotes, mentions, and reasons we don't recognize — stays a note, so
 * a quote is never dropped because its reason code is new.
 */
export function partitionRelatedNotes(
  notes: EventRecord[],
  focalEventId: string
): { reposts: EventRecord[]; mentions: EventRecord[] } {
  const focal = focalEventId.toLowerCase();
  const reposts: EventRecord[] = [];
  const mentions: EventRecord[] = [];
  for (const note of notes) {
    const reasons = relatedReasons(note);
    const target = parseRepostTarget(note).targetId?.toLowerCase();
    const repostOfFocal =
      reasons.includes("repost_linkage") || (isRepostEvent(note) && target === focal);
    if (repostOfFocal) reposts.push(note);
    else mentions.push(note);
  }
  return { reposts, mentions };
}

/** "Reposted by A, B, and N others" from the names we could resolve. */
export function formatRepostRollup(names: string[], total: number): string {
  const shown = names.filter((name) => name.trim().length > 0).slice(0, 2);
  const count = Math.max(total, shown.length);
  const rest = count - shown.length;
  if (shown.length === 0) return "No reposts have been indexed yet.";
  if (shown.length === 1 && rest <= 0) return `Reposted by ${shown[0]}`;
  if (rest <= 0) return `Reposted by ${shown[0]} and ${shown[1]}`;
  const lead = shown.join(", ");
  const others = `${rest} ${rest === 1 ? "other" : "others"}`;
  return `Reposted by ${lead}, and ${others}`;
}
