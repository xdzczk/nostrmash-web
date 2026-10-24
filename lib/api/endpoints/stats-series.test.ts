import { describe, expect, it } from "vitest";

import { sliceSeriesToHours } from "@/lib/api/endpoints/stats";

describe("sliceSeriesToHours", () => {
  it("keeps only points inside the requested hours of the newest sample", () => {
    const hour = 3600;
    const start = 1_700_000_000;
    const points = [
      { t: start, v: 1 },
      { t: start + hour, v: 2 },
      { t: start + 23 * hour, v: 3 },
      { t: start + 24 * hour, v: 4 },
      { t: start + 48 * hour, v: 5 },
    ];

    expect(sliceSeriesToHours(points, 24).map((point) => point.v)).toEqual([4, 5]);
    expect(sliceSeriesToHours(points, 24 * 7)).toEqual(points);
  });
});
