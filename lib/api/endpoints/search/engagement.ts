import { applyEngagementStats } from "@/components/explorer/utils";
import { getEventCounts, getNoteSummary } from "@/lib/api/endpoints/notes";
import type { CacheClass } from "@/lib/caching/policies";
import type { EventRecord } from "@/lib/types/api";

function hasEngagementFields(note: EventRecord): boolean {
  return (
    typeof note.reply_count === "number" ||
    typeof note.reaction_count === "number" ||
    typeof note.repost_count === "number" ||
    typeof note.zap_count === "number" ||
    typeof note.zap_msats === "number"
  );
}

/** Attach engagement counters when search/list payloads omit them. */
export async function withSearchEngagementCounts(
  notes: EventRecord[],
  cacheClass: CacheClass
): Promise<EventRecord[]> {
  if (notes.length === 0) return notes;
  if (notes.every(hasEngagementFields)) return notes;

  const settled = await Promise.allSettled(
    notes.map(async (note) => {
      if (hasEngagementFields(note)) return note;
      const counts = await getEventCounts(note.id, cacheClass);
      return applyEngagementStats(note, counts.counts ?? counts);
    })
  );

  return notes.map((note, index) => {
    const result = settled[index];
    return result?.status === "fulfilled" ? result.value : note;
  });
}

/** Direct event-id lookup for search, preferring summary so counts are present. */
export async function lookupNoteWithEngagement(
  eventId: string,
  cacheClass: CacheClass
): Promise<EventRecord | null> {
  try {
    const summary = await getNoteSummary(eventId, cacheClass);
    const base = summary.note ?? summary.event;
    if (!base) return null;
    return applyEngagementStats(base, summary.counts ?? {}, summary.summary ?? {});
  } catch {
    return null;
  }
}
