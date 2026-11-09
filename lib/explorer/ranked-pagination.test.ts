import { describe, expect, it } from "vitest";

import {
  encodeRankedContinuation,
  parseRankedContinuation,
  rankedListRequest,
  rankedPageContinuation,
  rankingContinuationQuery,
  rankingItemAnchor,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";

const VIEWER = "ab".repeat(32);

describe("ranked pagination", () => {
  it("clamps offsets into the range the ranking API accepts", () => {
    expect(readRankedOffset({})).toBe(0);
    expect(readRankedOffset({ offset: "-4" })).toBe(0);
    expect(readRankedOffset({ offset: "40" })).toBe(40);
    expect(readRankedOffset({ offset: "9000" })).toBe(5000);
    expect(readRankedOffset({ offset: "9000" }, VIEWER)).toBe(500);
    expect(readRankedOffset({ offset: "500" }, VIEWER)).toBe(500);
    expect(readRankedOffset({ offset: "900" }, "not-a-key")).toBe(900);
  });

  it("sends a viewer only when the value is an npub or hex pubkey, and caps that offset at 500", () => {
    expect(rankedListRequest("24h", "en", 40, VIEWER)).toEqual({
      window: "24h",
      offset: 40,
      limit: 20,
      lang: "en",
      viewer: VIEWER,
    });
    expect(rankedListRequest("7d", undefined, 800, `  ${VIEWER}  `)).toEqual({
      window: "7d",
      offset: 500,
      limit: 20,
      viewer: VIEWER,
    });
    expect(rankedListRequest("24h", "en", 40, "not-a-key")).toEqual({
      window: "24h",
      offset: 40,
      limit: 20,
      lang: "en",
    });
    expect(rankedListRequest(undefined, undefined, 9000)).toEqual({
      offset: 5000,
      limit: 20,
    });
  });

  it("offers another page only when this page is full", () => {
    const notes = [{ id: "a".repeat(64) }, { id: "b".repeat(64) }];
    expect(rankedPageContinuation("notes", notes, 0, 2)).toEqual({
      nextOffset: 2,
      token: encodeRankedContinuation(2, "a".repeat(64)),
    });
    expect(rankedPageContinuation("notes", notes.slice(0, 1), 0, 2)).toEqual({});
    expect(rankedPageContinuation("notes", notes, 4999, 2)).toEqual({});
    expect(rankedPageContinuation("notes", notes, 499, 2, VIEWER)).toEqual({});
    expect(rankedPageContinuation("notes", notes, 498, 2, VIEWER).nextOffset).toBe(500);
    expect(rankedPageContinuation("notes", notes, 499, 2).nextOffset).toBe(501);
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
    expect(rankingItemAnchor("bookmarked", { id: "Note" })).toBe("note");
    expect(rankingItemAnchor("zapped", { event_id: "Zap" })).toBe("zap");
    expect(rankingItemAnchor("followed", { pubkey: "Fol" })).toBe("fol");
    expect(rankingItemAnchor("supported", { pubkey: "Sup" })).toBe("sup");
    expect(rankingItemAnchor("hashtags", { hashtag: "#Nostr" })).toBe("nostr");
    expect(rankingItemAnchor("domains", "Example.com")).toBe("example.com");
  });

  it("pages bookmarked and followed without a window or a fake language", () => {
    expect(rankingContinuationQuery("bookmarked", "", "ja", 20)).toEqual({
      offset: 20,
      limit: 20,
      lang: "ja",
    });
    expect(rankingContinuationQuery("followed", "7d", "ja", 40)).toEqual({
      offset: 40,
      limit: 20,
    });
    expect(rankingContinuationQuery("zapped", "7d", "en", 20)).toEqual({
      window: "7d",
      offset: 20,
      limit: 20,
      lang: "en",
    });
    expect(rankingContinuationQuery("supported", "30d", "ja", 20)).toEqual({
      window: "30d",
      offset: 20,
      limit: 20,
    });
    expect(rankingContinuationQuery("zapped", "all", "en", 20)).toBeNull();
    expect(rankingContinuationQuery("notes", "", "", 20)).toBeNull();
    expect(rankingContinuationQuery("notes", "24h", "", 500, VIEWER)).toEqual({
      window: "24h",
      offset: 500,
      limit: 20,
      viewer: VIEWER,
    });
    expect(rankingContinuationQuery("notes", "24h", "", 501, VIEWER)).toBeNull();
    expect(rankingContinuationQuery("notes", "24h", "", 800)).toEqual({
      window: "24h",
      offset: 800,
      limit: 20,
    });
    expect(rankingContinuationQuery("notes", "24h", "en", 20, "not-a-key")).toEqual({
      window: "24h",
      offset: 20,
      limit: 20,
      lang: "en",
    });
  });
});
