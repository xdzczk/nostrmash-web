import type { EventRecord } from "@/lib/types/api";

export type ReplyNode = {
  reply: EventRecord;
  /** Pubkey of the author this reply addresses when its parent isn't the focal note. */
  replyingToPubkey?: string;
  /** Id of the direct parent event (focal note, a sibling, or an out-of-page note). */
  parentId?: string;
  /** Consecutive identical replies (same author + normalised content) folded into this one. */
  duplicateCount: number;
  children: ReplyNode[];
};

function eventId(event: EventRecord): string {
  const id =
    (typeof event.id === "string" && event.id) ||
    (typeof event.event_id === "string" && event.event_id) ||
    "";
  return id.toLowerCase();
}

function eTags(event: EventRecord): string[][] {
  if (!Array.isArray(event.tags)) return [];
  return event.tags.filter(
    (tag): tag is string[] =>
      Array.isArray(tag) && tag[0] === "e" && typeof tag[1] === "string" && tag[1].length > 0
  );
}

/**
 * NIP-10 parent resolution: prefer the `reply` marker, then the `root` marker
 * when it is the only `e` tag, then the last positional `e` tag.
 */
export function resolveReplyParent(event: EventRecord): string | undefined {
  const tags = eTags(event);
  if (tags.length === 0) return undefined;
  const marker = (tag: string[]) => (typeof tag[3] === "string" ? tag[3].toLowerCase() : "");
  const idOf = (tag: string[] | undefined) =>
    typeof tag?.[1] === "string" ? tag[1].toLowerCase() : undefined;
  const marked = tags.find((tag) => marker(tag) === "reply");
  if (marked) return idOf(marked);
  const root = tags.find((tag) => marker(tag) === "root");
  if (root && tags.length === 1) return idOf(root);
  const positional = tags.filter((tag) => marker(tag) === "");
  if (positional.length > 0) return idOf(positional[positional.length - 1]);
  return idOf(tags[tags.length - 1]);
}

/**
 * NIP-10 root resolution: the `root` marker, else the first positional `e`
 * tag when there is more than one (single positional tags are the parent).
 */
export function resolveReplyRoot(event: EventRecord): string | undefined {
  const tags = eTags(event);
  if (tags.length === 0) return undefined;
  const marker = (tag: string[]) => (typeof tag[3] === "string" ? tag[3].toLowerCase() : "");
  const idOf = (tag: string[] | undefined) =>
    typeof tag?.[1] === "string" ? tag[1].toLowerCase() : undefined;
  const root = tags.find((tag) => marker(tag) === "root");
  if (root) return idOf(root);
  const positional = tags.filter((tag) => marker(tag) === "");
  if (positional.length > 1) return idOf(positional[0]);
  return undefined;
}

function normalizeContent(event: EventRecord): string {
  return typeof event.content === "string"
    ? event.content.replace(/\s+/g, " ").trim().toLowerCase()
    : "";
}

function createdAt(event: EventRecord): number {
  return typeof event.created_at === "number" && Number.isFinite(event.created_at)
    ? event.created_at
    : Number.MAX_SAFE_INTEGER;
}

/** Fold consecutive replies with identical author + content into one node. */
export function collapseDuplicateReplies(nodes: ReplyNode[]): ReplyNode[] {
  const result: ReplyNode[] = [];
  for (const node of nodes) {
    const previous = result[result.length - 1];
    if (
      previous &&
      typeof previous.reply.pubkey === "string" &&
      previous.reply.pubkey === node.reply.pubkey &&
      normalizeContent(previous.reply) === normalizeContent(node.reply) &&
      normalizeContent(node.reply).length > 0
    ) {
      previous.duplicateCount += node.duplicateCount;
      previous.children.push(...node.children);
      continue;
    }
    result.push(node);
  }
  return result;
}

/**
 * Arrange a flat reply page into direct replies to the focal note with one
 * level of nesting. Replies whose parent is another reply on the page nest
 * under it; deeper descendants flatten under the nearest in-page ancestor and
 * carry `replyingToPubkey` so the UI can say who they address. Replies whose
 * parent is unknown (not the focal note, not on the page) are shown at the top
 * level with their parent id preserved.
 */
export function buildReplyTree(replies: EventRecord[], focalEventId: string): ReplyNode[] {
  const focal = focalEventId.toLowerCase();
  const byId = new Map<string, EventRecord>();
  for (const reply of replies) {
    const id = eventId(reply);
    if (id) byId.set(id, reply);
  }

  const parentOf = new Map<string, string | undefined>();
  for (const reply of replies) {
    parentOf.set(eventId(reply), resolveReplyParent(reply));
  }

  // Walk up until we hit the focal note or an in-page reply; cap depth.
  const resolveAnchor = (reply: EventRecord): { anchor: string | undefined; direct: boolean } => {
    let current = parentOf.get(eventId(reply));
    let hops = 0;
    while (current && current !== focal && !byId.has(current) && hops < 8) {
      const next = parentOf.get(current);
      if (!next) break;
      current = next;
      hops += 1;
    }
    if (!current || current === focal) return { anchor: undefined, direct: true };
    if (byId.has(current)) return { anchor: current, direct: false };
    return { anchor: undefined, direct: true };
  };

  const sorted = [...replies].sort((a, b) => createdAt(a) - createdAt(b));
  const nodes = new Map<string, ReplyNode>();
  const topLevel: ReplyNode[] = [];

  for (const reply of sorted) {
    const id = eventId(reply);
    const node: ReplyNode = {
      reply,
      parentId: parentOf.get(id),
      duplicateCount: 1,
      children: [],
    };
    if (id) nodes.set(id, node);
  }

  for (const reply of sorted) {
    const id = eventId(reply);
    const node = id ? nodes.get(id) : undefined;
    if (!node) continue;
    const { anchor } = resolveAnchor(reply);
    if (!anchor) {
      topLevel.push(node);
      continue;
    }
    // Find the top-level ancestor to attach under (one visual level only).
    let attachTo = nodes.get(anchor);
    let guard = 0;
    while (attachTo && guard < 8) {
      const parentId = attachTo.parentId;
      const parentNode = parentId && parentId !== focal ? nodes.get(parentId) : undefined;
      if (!parentNode) break;
      attachTo = parentNode;
      guard += 1;
    }
    if (!attachTo) {
      topLevel.push(node);
      continue;
    }
    const directParent = nodes.get(anchor);
    if (
      directParent &&
      directParent !== attachTo &&
      typeof directParent.reply.pubkey === "string"
    ) {
      node.replyingToPubkey = directParent.reply.pubkey;
    }
    attachTo.children.push(node);
  }

  for (const node of nodes.values()) {
    node.children.sort((a, b) => createdAt(a.reply) - createdAt(b.reply));
    node.children = collapseDuplicateReplies(node.children);
  }

  return collapseDuplicateReplies(topLevel);
}

export function countReplyNodes(nodes: ReplyNode[]): number {
  return nodes.reduce((sum, node) => sum + node.duplicateCount + countReplyNodes(node.children), 0);
}
