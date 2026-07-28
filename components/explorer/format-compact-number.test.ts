import { describe, expect, it } from "vitest";
import { formatCompactNumber } from "@/components/explorer/utils";

describe("formatCompactNumber", () => {
  it("formats large numbers compactly", () => {
    expect(formatCompactNumber(33_086_870)).toMatch(/33(\.\d)?M/);
    expect(formatCompactNumber(615_082)).toMatch(/615(\.\d)?K/);
  });

  it("formats zero and small numbers", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(42)).toBe("42");
  });

  it("falls back for non-numbers", () => {
    expect(formatCompactNumber(null)).toBe("—");
    expect(formatCompactNumber("hello")).toBe("hello");
  });
});
