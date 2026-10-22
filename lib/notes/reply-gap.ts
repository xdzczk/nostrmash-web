import type { EventRecord } from "@/lib/types/api";

function nestedReplyCount(reply: EventRecord): number {
  const direct = reply.reply_count;
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) return direct;
  const counts = reply.counts;
  if (typeof counts === "object" && counts !== null && !Array.isArray(counts)) {
    const nested = (counts as { reply_count?: unknown }).reply_count;
    if (typeof nested === "number" && Number.isFinite(nested) && nested > 0) return nested;
  }
  return 0;
}

/**
 * Replies this page can account for: each returned event, plus the replies
 * that event says it has. Those nested replies are reachable with "Show N
 * replies", so they are not missing from the index. The replies API returns
 * only direct children, so a nested count is not already inside `replies`.
 */
export function accountedReplyCount(replies: readonly EventRecord[]): number {
  let total = 0;
  for (const reply of replies) {
    total += 1 + nestedReplyCount(reply);
  }
  return total;
}

/** How many counted replies are neither listed nor expandable from this list. */
export function unindexedReplyCount(accounted: number, reported?: number): number {
  if (typeof reported !== "number" || !Number.isFinite(reported)) return 0;
  return Math.max(0, Math.trunc(reported) - accounted);
}

export function formatUnindexedReplyLine(missing: number): string | null {
  if (missing <= 0) return null;
  if (missing === 1) return "1 reply isn't in the index.";
  return `${missing.toLocaleString()} replies aren't in the index.`;
}
