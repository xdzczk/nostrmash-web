import { normalizeEventRecord } from "@/lib/api/normalize/entities";
import type { EventRecord } from "@/lib/types/api";

export const REPOST_KINDS = new Set([6, 16]);

export type RepostTarget = {
  /** The reposted event when it was embedded as JSON in `content`. */
  embedded?: EventRecord;
  /** Id of the reposted event from the `e` tag (or the embedded payload). */
  targetId?: string;
  /** Pubkey of the reposted event's author when known. */
  targetPubkey?: string;
};

export function isRepostEvent(event: EventRecord | null | undefined): boolean {
  return typeof event?.kind === "number" && REPOST_KINDS.has(event.kind);
}

function firstTagValue(event: EventRecord, name: string): string | undefined {
  if (!Array.isArray(event.tags)) return undefined;
  for (const tag of event.tags) {
    if (Array.isArray(tag) && tag[0] === name && typeof tag[1] === "string" && tag[1]) {
      return tag[1];
    }
  }
  return undefined;
}

/**
 * NIP-18: kind 6 (and 16 generic) reposts carry the original event as JSON in
 * `content` and reference it with an `e` tag. Content may be empty or
 * malformed, so callers fall back to the `e` tag id for a lookup.
 */
export function parseRepostTarget(event: EventRecord): RepostTarget {
  if (!isRepostEvent(event)) return {};
  const targetId = firstTagValue(event, "e")?.toLowerCase();
  const targetPubkey = firstTagValue(event, "p")?.toLowerCase();

  if (typeof event.content === "string" && event.content.trim().startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(event.content);
      const embedded = normalizeEventRecord(parsed);
      if (embedded && typeof embedded.id === "string" && embedded.id.length > 0) {
        return {
          embedded,
          targetId: embedded.id.toLowerCase(),
          targetPubkey:
            typeof embedded.pubkey === "string" ? embedded.pubkey.toLowerCase() : targetPubkey,
        };
      }
    } catch {
      // Not JSON; fall through to tag-based resolution.
    }
  }

  return { targetId, targetPubkey };
}

/** Event ids that reposts in `events` reference without embedding them. */
export function collectRepostTargetIds(events: EventRecord[]): string[] {
  const ids = new Set<string>();
  for (const event of events) {
    if (!isRepostEvent(event)) continue;
    const { embedded, targetId } = parseRepostTarget(event);
    if (!embedded && targetId) ids.add(targetId);
  }
  return [...ids];
}
