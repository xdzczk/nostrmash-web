import { describe, expect, it } from "vitest";

import {
  belowVolumeFloor,
  formatEvidenceValue,
  listedVolume,
  mapServerRankingReasons,
  rankMovement,
  reasonsBesideSourceFigure,
  sourceCount,
} from "./reasons";

describe("formatEvidenceValue", () => {
  it("never renders fractional people or things", () => {
    expect(formatEvidenceValue(3.75, "followers")).toBe("4");
    expect(formatEvidenceValue(9.5, "followers")).toBe("10");
    expect(formatEvidenceValue(1.2, "posts")).toBe("1");
  });

  it("keeps one decimal for small ratios and none above ten", () => {
    expect(formatEvidenceValue(8.214, "interactions per note")).toBe("8.2");
    expect(formatEvidenceValue(0.403, "interactions per follower")).toBe("0.4");
    expect(formatEvidenceValue(12.6, "interactions per note")).toBe("13");
  });
});

describe("mapServerRankingReasons", () => {
  it("rounds evidence, singularises units, and prefixes growth with +", () => {
    expect(
      mapServerRankingReasons({
        rank: 1,
        score: 1,
        reasons: [
          { code: "follower_growth", evidence: [{ metric: "x", value: 3.75, unit: "followers" }] },
          {
            code: "engagement_quality",
            evidence: [{ metric: "x", value: 8.214, unit: "interactions per note" }],
          },
        ],
      })
    ).toEqual([
      { text: "follower growth", support: "+4 followers", code: "follower_growth" },
      {
        text: "engagement per post",
        support: "8.2 interactions per note",
        code: "engagement_quality",
      },
    ]);
  });

  it("drops count-based reasons below the evidence floor so a rank is never justified by one post", () => {
    expect(
      mapServerRankingReasons({
        rank: 1,
        score: 1,
        reasons: [
          { code: "publishing_momentum", evidence: [{ metric: "x", value: 1, unit: "posts" }] },
          {
            code: "engagement_received",
            evidence: [{ metric: "x", value: 40, unit: "interactions" }],
          },
        ],
      })
    ).toEqual([
      { text: "engagement received", support: "40 interactions", code: "engagement_received" },
    ]);
  });

  it("drops ratio reasons below one and keeps the ones worth reading", () => {
    expect(
      mapServerRankingReasons({
        rank: 1,
        score: 1,
        reasons: [
          {
            code: "relative_engagement_growth",
            evidence: [{ metric: "x", value: 0.1, unit: "interactions per follower" }],
          },
          {
            code: "engagement_quality",
            evidence: [{ metric: "x", value: 6.8, unit: "interactions per note" }],
          },
          {
            code: "relative_engagement_growth",
            evidence: [{ metric: "x", value: 10, unit: "interactions per follower" }],
          },
        ],
      })
    ).toEqual([
      {
        text: "engagement per post",
        support: "6.8 interactions per note",
        code: "engagement_quality",
      },
      {
        text: "engagement vs. audience size",
        support: "10 interactions per follower",
        code: "relative_engagement_growth",
      },
    ]);
  });

  it("humanises unknown codes instead of discarding the server's rationale", () => {
    expect(
      mapServerRankingReasons({ rank: 1, score: 1, reasons: [{ code: "zap_velocity" }] })
    ).toEqual([{ text: "zap velocity", support: undefined, code: "zap_velocity" }]);
  });

  it("names a combined score and a newer row without inventing a count", () => {
    expect(
      mapServerRankingReasons({
        rank: 1,
        score: 1,
        reasons: [{ code: "combined_engagement" }, { code: "recency" }],
      })
    ).toEqual([
      { text: "combined engagement", support: undefined, code: "combined_engagement" },
      { text: "newer in this window", support: undefined, code: "recency" },
    ]);
  });
});

describe("reasonsBesideSourceFigure", () => {
  it("drops the why-now line when author breadth is already the source figure", () => {
    const ranking = {
      rank: 1,
      score: 455,
      source_breadth: 455,
      reasons: [
        {
          code: "author_breadth",
          evidence: [{ metric: "unique_authors", value: 455, unit: "authors" }],
        },
        {
          code: "mention_volume",
          evidence: [{ metric: "event_count", value: 1576, unit: "events" }],
        },
      ],
    };
    const presented = mapServerRankingReasons(ranking);
    expect(presented.map((reason) => reason.code)).toEqual(["author_breadth", "mention_volume"]);
    expect(reasonsBesideSourceFigure(ranking, presented)).toEqual([]);
  });

  it("does not fall through to volume when one author is below the display floor", () => {
    const ranking = {
      rank: 1,
      score: 1,
      reasons: [
        {
          code: "author_breadth",
          evidence: [{ metric: "unique_authors", value: 1, unit: "authors" }],
        },
        {
          code: "mention_volume",
          evidence: [{ metric: "event_count", value: 40, unit: "events" }],
        },
      ],
    };
    const presented = mapServerRankingReasons(ranking);
    expect(presented.map((reason) => reason.code)).toEqual(["mention_volume"]);
    expect(reasonsBesideSourceFigure(ranking, presented)).toEqual([]);
  });
});

describe("sourceCount", () => {
  it("uses source breadth as the row figure and ignores missing or empty breadth", () => {
    expect(sourceCount({ rank: 2, score: 4000, source_breadth: 290.4 })).toBe(290);
    expect(sourceCount({ rank: 1, score: 12 })).toBeNull();
    expect(sourceCount({ rank: 1, score: 12, source_breadth: 0 })).toBeNull();
    expect(sourceCount(undefined)).toBeNull();
  });
});

describe("listedVolume", () => {
  it("treats a count under two as below the floor and keeps a missing count", () => {
    expect(belowVolumeFloor(listedVolume([1]))).toBe(true);
    expect(belowVolumeFloor(listedVolume([0, 12]))).toBe(false);
    expect(belowVolumeFloor(listedVolume([undefined]))).toBe(false);
    expect(listedVolume([0, 0])).toBe(0);
  });
});

describe("rankMovement", () => {
  it("derives places moved from previous_rank", () => {
    expect(rankMovement({ rank: 2, score: 1, previous_rank: 5 })).toEqual({
      direction: "up",
      places: 3,
    });
    expect(rankMovement({ rank: 4, score: 1, previous_rank: 1 })).toEqual({
      direction: "down",
      places: 3,
    });
    expect(rankMovement({ rank: 4, score: 1, previous_rank: 4 })).toBeNull();
  });

  it("falls back to rank_delta and stays silent without history", () => {
    expect(rankMovement({ rank: 2, score: 1, rank_delta: 1 })).toEqual({
      direction: "up",
      places: 1,
    });
    expect(rankMovement({ rank: 2, score: 1 })).toBeNull();
    expect(rankMovement(undefined)).toBeNull();
  });
});
