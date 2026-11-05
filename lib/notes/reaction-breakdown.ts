import { normalizeReactionBreakdown } from "@/lib/api/normalize/ecosystem";
import { asRecord } from "@/lib/api/normalize/helpers";
import type { ReactionBreakdownItem } from "@/lib/types/api";

function breakdownFrom(value: unknown): ReactionBreakdownItem[] {
  if (Array.isArray(value)) return normalizeReactionBreakdown(value);
  const record = asRecord(value);
  if (!record) return [];
  const direct = normalizeReactionBreakdown(record.reaction_breakdown);
  if (direct.length > 0) return direct;
  const counts = asRecord(record.counts);
  return normalizeReactionBreakdown(counts?.reaction_breakdown);
}

/** First non-empty breakdown from an event, a counts payload, or a raw array. */
export function readReactionBreakdown(...sources: unknown[]): ReactionBreakdownItem[] {
  for (const source of sources) {
    const items = breakdownFrom(source);
    if (items.length > 0) return items;
  }
  return [];
}
