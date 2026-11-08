import { describe, expect, it } from "vitest";

import {
  authorBaselineComparison,
  baselineComparison,
  readEntityBaseline,
} from "@/lib/discover/baseline";

describe("readEntityBaseline", () => {
  it("keeps a finite typical and value", () => {
    expect(
      readEntityBaseline({
        metric: "unique_authors",
        window: "24h",
        value: 40,
        typical: 10,
        typical_basis: "entity_30d_median",
      })
    ).toMatchObject({ metric: "unique_authors", value: 40, typical: 10, ratio: 4 });
  });

  it("rejects a missing or non-positive typical", () => {
    expect(readEntityBaseline({ metric: "unique_authors", value: 4, typical: 0 })).toBeNull();
    expect(readEntityBaseline({ value: 4, typical: 2 })).toBeNull();
    expect(readEntityBaseline(null)).toBeNull();
  });
});

describe("baseline phrases", () => {
  it("names the stored basis", () => {
    const baseline = readEntityBaseline({
      metric: "note_volume",
      value: 180,
      typical: 100,
      typical_basis: "same_weekday_median",
    });
    expect(baselineComparison(baseline)).toBe("1.8x a typical same weekday");
  });

  it("compares an author count only when the stored value matches", () => {
    const baseline = {
      metric: "unique_authors",
      value: 40,
      typical: 10,
      typical_basis: "entity_30d_median",
    };
    expect(authorBaselineComparison(baseline, 40)).toBe("4x its usual day");
    expect(authorBaselineComparison(baseline, 12)).toBeNull();
  });
});
