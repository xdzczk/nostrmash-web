import { describe, expect, it } from "vitest";

import {
  encodeRankedContinuation,
  parseRankedContinuation,
  rankedPageContinuation,
  rankingItemAnchor,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";

describe("ranked pagination", () => {
  it("clamps offsets into the range the ranking API accepts", () => {
    expect(readRankedOffset({})).toBe(0);
    expect(readRankedOffset({ offset: "-4" })).toBe(0);
    expect(readRankedOffset({ offset: "40" })).toBe(40);
    expect(readRankedOffset({ offset: "9000" })).toBe(5000);
  });

  it("offers another page only when this page is full", () => {
    const notes = [{ id: "a".repeat(64) }, { id: "b".repeat(64) }];
    expect(rankedPageContinuation("notes", notes, 0, 2)).toEqual({
      nextOffset: 2,
      token: encodeRankedContinuation(2, "a".repeat(64)),
    });
    expect(rankedPageContinuation("notes", notes.slice(0, 1), 0, 2)).toEqual({});
    expect(rankedPageContinuation("notes", notes, 4999, 2)).toEqual({});
  });

  it("round-trips the continuation token and rejects junk", () => {
    const token = encodeRankedContinuation(20, "npub example");
    expect(parseRankedContinuation(token)).toEqual({ offset: 20, anchor: "npub example" });
    expect(parseRankedContinuation("cursor-from-somewhere")).toBeNull();
    expect(parseRankedContinuation("rank:nope:abc")).toBeNull();
  });

  it("reads a stable anchor from each ranking shape", () => {
    expect(rankingItemAnchor("notes", { event_id: "ABC" })).toBe("abc");
    expect(rankingItemAnchor("profiles", { pubkey: "PK" })).toBe("pk");
    expect(rankingItemAnchor("hashtags", { hashtag: "#Nostr" })).toBe("nostr");
    expect(rankingItemAnchor("domains", "Example.com")).toBe("example.com");
  });
});
