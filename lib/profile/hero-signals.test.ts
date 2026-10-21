import { describe, expect, it } from "vitest";

import {
  formatNip05,
  formatTrustPercentile,
  formatTrustTier,
  formatUnixDate,
  lastActiveLabel,
} from "@/lib/profile/hero-signals";

describe("formatNip05", () => {
  it("collapses the root identifier to the bare domain", () => {
    expect(formatNip05("_@layer1.studio")).toBe("layer1.studio");
  });

  it("leaves regular identifiers unchanged", () => {
    expect(formatNip05("derekross@grownostr.org")).toBe("derekross@grownostr.org");
  });

  it("returns null for empty input", () => {
    expect(formatNip05("")).toBeNull();
    expect(formatNip05(undefined)).toBeNull();
  });
});

describe("formatTrustPercentile", () => {
  it("never claims top 0%", () => {
    expect(formatTrustPercentile(0.00103)).toBe("top 0.1%");
    expect(formatTrustPercentile(0)).toBe("top 0.1%");
  });

  it("rounds readable bands", () => {
    expect(formatTrustPercentile(0.004)).toBe("top 0.4%");
    expect(formatTrustPercentile(0.034)).toBe("top 3%");
    expect(formatTrustPercentile(0.42)).toBe("top 40%");
  });

  it("rejects out-of-range values", () => {
    expect(formatTrustPercentile(1.4)).toBeNull();
    expect(formatTrustPercentile(-0.1)).toBeNull();
    expect(formatTrustPercentile(undefined)).toBeNull();
  });
});

describe("formatTrustTier", () => {
  it("builds a pill label with tier and percentile", () => {
    expect(formatTrustTier({ tier: "seed", percentile: 0.001 })).toEqual({
      tier: "Seed",
      percentile: "top 0.1%",
      label: "Seed · top 0.1%",
    });
  });

  it("falls back to tier only", () => {
    expect(formatTrustTier({ tier: "web_of_trust" })?.label).toBe("Web Of Trust");
  });

  it("returns null without a tier", () => {
    expect(formatTrustTier({ percentile: 0.2 })).toBeNull();
    expect(formatTrustTier(null)).toBeNull();
  });
});

describe("lastActiveLabel", () => {
  const now = Date.UTC(2026, 9, 21, 12, 0, 0);

  it("formats hours and days", () => {
    expect(lastActiveLabel(now / 1000 - 9 * 3600, now)).toBe("Active 9h ago");
    expect(lastActiveLabel(now / 1000 - 5 * 86400, now)).toBe("Active 5d ago");
  });

  it("formats months and years", () => {
    expect(lastActiveLabel(now / 1000 - 90 * 86400, now)).toBe("Active 3mo ago");
    expect(lastActiveLabel(now / 1000 - 800 * 86400, now)).toBe("Active 2y ago");
  });

  it("returns null when missing", () => {
    expect(lastActiveLabel(undefined, now)).toBeNull();
  });
});

describe("formatUnixDate", () => {
  it("renders an ISO date from unix seconds", () => {
    expect(formatUnixDate(1790952373)).toBe("2026-10-02");
  });

  it("accepts the digit-string form the summary identity details use", () => {
    expect(formatUnixDate("1789138347")).toBe("2026-09-11");
  });

  it("returns null for junk", () => {
    expect(formatUnixDate("nope")).toBeNull();
  });
});
