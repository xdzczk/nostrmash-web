import { resolveReplyParent } from "@/lib/notes/thread-tree";
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

function eventId(event: EventRecord): string {
  return typeof event.id === "string" ? event.id.toLowerCase() : "";
}

/**
 * Reply totals already include kind 1111 comments. Count a comment here when
 * it is visible on its own, and skip one nested under a reply on this page:
 * that reply's count already includes it.
 */
export function accountedConversationCount(
  replies: readonly EventRecord[],
  comments: readonly EventRecord[],
  focalEventId: string
): number {
  const focal = focalEventId.toLowerCase();
  const replyIds = new Set(replies.map(eventId).filter((id) => id.length > 0));
  const seen = new Set(replyIds);
  let extra = 0;
  for (const comment of comments) {
    const id = eventId(comment);
    if (!id || id === focal || seen.has(id)) continue;
    seen.add(id);
    const parent = resolveReplyParent(comment)?.toLowerCase();
    if (parent && replyIds.has(parent)) continue;
    extra += 1;
  }
  return accountedReplyCount(replies) + extra;
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
