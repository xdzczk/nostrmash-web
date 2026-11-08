import { describe, expect, it } from "vitest";

import { vsBaseline } from "./relative";

describe("vsBaseline", () => {
  it("names a multiple, a percent, and a level that has not moved", () => {
    expect(vsBaseline(40, 10)).toBe("4x usual");
    expect(vsBaseline(137, 100)).toBe("+37% vs usual");
    expect(vsBaseline(100, 100)).toBe("about the same as usual");
    expect(vsBaseline(70, 100)).toBe("30% below usual");
  });

  it("uses the basis in the phrase", () => {
    expect(vsBaseline(140, 100, "the 7-day average")).toBe("+40% vs the 7-day average");
  });

  it("returns nothing without a usable baseline", () => {
    expect(vsBaseline(10, 0)).toBeNull();
    expect(vsBaseline(Number.NaN, 10)).toBeNull();
  });
});
