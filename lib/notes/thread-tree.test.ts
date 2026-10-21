import { describe, expect, it } from "vitest";

import {
  buildReplyTree,
  collapseDuplicateReplies,
  countReplyNodes,
  resolveReplyParent,
  resolveReplyRoot,
} from "./thread-tree";
import type { EventRecord } from "@/lib/types/api";

const FOCAL = "f".repeat(64);

function reply(
  id: string,
  pubkey: string,
  content: string,
  createdAt: number,
  tags: string[][]
): EventRecord {
  return { id, pubkey, content, created_at: createdAt, kind: 1, tags };
}

describe("resolveReplyParent", () => {
  it("prefers the NIP-10 reply marker", () => {
    const event = reply("a", "p", "x", 1, [
      ["e", FOCAL, "", "root"],
      ["e", "b".repeat(64), "", "reply"],
    ]);
    expect(resolveReplyParent(event)).toBe("b".repeat(64));
  });

  it("uses the root marker when it is the only e tag", () => {
    const event = reply("a", "p", "x", 1, [["e", FOCAL, "", "root"]]);
    expect(resolveReplyParent(event)).toBe(FOCAL);
  });

  it("falls back to the last positional e tag", () => {
    const event = reply("a", "p", "x", 1, [
      ["e", FOCAL],
      ["e", "c".repeat(64)],
    ]);
    expect(resolveReplyParent(event)).toBe("c".repeat(64));
  });

  it("returns undefined without e tags", () => {
    expect(resolveReplyParent(reply("a", "p", "x", 1, [["p", "zz"]]))).toBeUndefined();
  });
});

describe("resolveReplyRoot", () => {
  it("uses the root marker", () => {
    const event = reply("a", "p", "x", 1, [
      ["e", FOCAL, "", "root"],
      ["e", "b".repeat(64), "", "reply"],
    ]);
    expect(resolveReplyRoot(event)).toBe(FOCAL);
  });

  it("uses the first positional e tag only when there are several", () => {
    const two = reply("a", "p", "x", 1, [
      ["e", FOCAL],
      ["e", "b".repeat(64)],
    ]);
    expect(resolveReplyRoot(two)).toBe(FOCAL);
    const one = reply("a", "p", "x", 1, [["e", FOCAL]]);
    expect(resolveReplyRoot(one)).toBeUndefined();
  });

  it("returns undefined for a top-level note", () => {
    expect(resolveReplyRoot(reply("a", "p", "x", 1, [["p", "q"]]))).toBeUndefined();
  });
});

describe("buildReplyTree", () => {
  const r1 = reply("1".repeat(64), "alice", "First", 10, [["e", FOCAL, "", "root"]]);
  const r2 = reply("2".repeat(64), "bob", "Reply to first", 20, [
    ["e", FOCAL, "", "root"],
    ["e", "1".repeat(64), "", "reply"],
  ]);
  const r3 = reply("3".repeat(64), "carol", "Reply to bob", 30, [
    ["e", FOCAL, "", "root"],
    ["e", "2".repeat(64), "", "reply"],
  ]);
  const r4 = reply("4".repeat(64), "dave", "Direct", 5, [["e", FOCAL, "", "root"]]);

  it("nests one level and flattens deeper descendants under the top-level ancestor", () => {
    const tree = buildReplyTree([r3, r1, r2, r4], FOCAL);
    expect(tree.map((node) => node.reply.id)).toEqual([r4.id, r1.id]);
    const first = tree[1]!;
    expect(first.children.map((node) => node.reply.id)).toEqual([r2.id, r3.id]);
    expect(first.children[0]?.replyingToPubkey).toBeUndefined();
    expect(first.children[1]?.replyingToPubkey).toBe("bob");
    expect(countReplyNodes(tree)).toBe(4);
  });

  it("keeps replies with unknown parents at the top level", () => {
    const orphan = reply("5".repeat(64), "erin", "Orphan", 40, [
      ["e", FOCAL, "", "root"],
      ["e", "9".repeat(64), "", "reply"],
    ]);
    const tree = buildReplyTree([orphan], FOCAL);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.parentId).toBe("9".repeat(64));
  });

  it("collapses consecutive duplicate replies", () => {
    const dupe = (id: string, createdAt: number) =>
      reply(id.repeat(64), "bot", "Stay positive.  Explore other platforms.", createdAt, [
        ["e", FOCAL, "", "root"],
      ]);
    const tree = buildReplyTree([dupe("a", 1), dupe("b", 2), dupe("c", 3), r1], FOCAL);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.duplicateCount).toBe(3);
    expect(countReplyNodes(tree)).toBe(4);
  });
});

describe("collapseDuplicateReplies", () => {
  it("does not collapse empty-content replies", () => {
    const a = { reply: reply("a", "p", "", 1, []), duplicateCount: 1, children: [] };
    const b = { reply: reply("b", "p", "", 2, []), duplicateCount: 1, children: [] };
    expect(collapseDuplicateReplies([a, b])).toHaveLength(2);
  });
});
