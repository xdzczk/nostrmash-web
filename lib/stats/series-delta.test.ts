import { describe, expect, it } from "vitest";

import { rollingTotalDeltas } from "@/lib/stats/series-delta";

describe("rollingTotalDeltas", () => {
  it("subtracts the previous rolling total", () => {
    expect(
      rollingTotalDeltas([
        { t: 1, v: 100 },
        { t: 2, v: 110 },
        { t: 3, v: 90 },
      ])
    ).toEqual([
      { t: 2, v: 10 },
      { t: 3, v: -20 },
    ]);
  });

  it("returns nothing until there are two samples", () => {
    expect(rollingTotalDeltas([{ t: 1, v: 5 }])).toEqual([]);
  });
});
