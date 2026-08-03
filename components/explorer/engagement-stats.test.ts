import { describe, expect, it } from "vitest";

import {
  applyEngagementStats,
  extractEngagementStats,
  formatSatsFromMsats,
} from "@/components/explorer/utils";

describe("formatSatsFromMsats", () => {
  it("formats whole and fractional sats from msats", () => {
    expect(formatSatsFromMsats(21_000)).toBe("21 sats");
    expect(formatSatsFromMsats(1_500)).toBe("1.5 sats");
    expect(formatSatsFromMsats(250)).toBe("250 msats");
    expect(formatSatsFromMsats(0)).toBeNull();
  });
});

describe("extractEngagementStats", () => {
  it("always returns all four engagement metrics", () => {
    expect(extractEngagementStats({})).toEqual([
      { label: "reply_count", value: 0 },
      { label: "repost_count", value: 0 },
      { label: "reaction_count", value: 0 },
      { label: "zap_count", value: 0 },
    ]);
  });

  it("reads top-level counts and nested counts/summary", () => {
    expect(
      extractEngagementStats({
        reply_count: 4,
        counts: { repost_count: 2 },
        summary: { reaction_count: 7, zap_count: 1 },
      })
    ).toEqual([
      { label: "reply_count", value: 4 },
      { label: "repost_count", value: 2 },
      { label: "reaction_count", value: 7 },
      { label: "zap_count", value: 1 },
    ]);
  });

  it("prefers earlier sources and accepts aliases", () => {
    expect(
      extractEngagementStats(
        { replies: 9, boosts: 3, likes: 5, zaps: 2 },
        { reply_count: 1, repost_count: 1, reaction_count: 1, zap_count: 1 }
      )
    ).toEqual([
      { label: "reply_count", value: 9 },
      { label: "repost_count", value: 3 },
      { label: "reaction_count", value: 5 },
      { label: "zap_count", value: 2 },
    ]);
  });

  it("includes sats detail next to zap counts when zap_msats is present", () => {
    expect(
      extractEngagementStats({
        zap_count: 3,
        zap_msats: 42_000,
      })
    ).toEqual([
      { label: "reply_count", value: 0 },
      { label: "repost_count", value: 0 },
      { label: "reaction_count", value: 0 },
      { label: "zap_count", value: 3, detail: "42 sats" },
    ]);
  });
});

describe("applyEngagementStats", () => {
  it("merges complete stats onto a note record", () => {
    const note = applyEngagementStats(
      { id: "abc", content: "hello" },
      { counts: { reply_count: 2, reaction_count: 1, zap_msats: 5000 } }
    );
    expect(note).toMatchObject({
      id: "abc",
      content: "hello",
      reply_count: 2,
      repost_count: 0,
      reaction_count: 1,
      zap_count: 0,
      zap_msats: 5000,
    });
  });
});
