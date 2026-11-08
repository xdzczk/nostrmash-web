import { describe, expect, it } from "vitest";

import { seriesJumpIndexes, seriesJumped } from "./series-jumps";

describe("series jumps", () => {
  it("flags a move of 2.5x or more in either direction", () => {
    expect(seriesJumped(100, 250)).toBe(true);
    expect(seriesJumped(250, 100)).toBe(true);
    expect(seriesJumped(100, 249)).toBe(false);
    expect(seriesJumped(0, 100)).toBe(false);
  });

  it("returns the later index of each jump", () => {
    expect(
      seriesJumpIndexes([
        { t: 1, v: 100 },
        { t: 2, v: 110 },
        { t: 3, v: 400 },
      ])
    ).toEqual([2]);
  });
});
