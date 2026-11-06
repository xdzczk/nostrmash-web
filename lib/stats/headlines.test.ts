import { afterEach, describe, expect, it, vi } from "vitest";

import { moderationHeadline, peopleHeadline } from "@/lib/stats/headlines";

describe("stats headlines", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("says yesterday or a short date, not an ISO day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T15:00:00Z"));
    expect(
      moderationHeadline({
        volume: [{ day: "2026-11-05", report_type: "spam", count: 10 }],
      })
    ).toContain("yesterday");
    expect(
      moderationHeadline({
        volume: [{ day: "2026-11-06", report_type: "spam", count: 147 }],
      })
    ).toContain("on Nov 6");
    expect(
      moderationHeadline({
        volume: [{ day: "2026-11-06", report_type: "spam", count: 147 }],
      })
    ).not.toContain("2026-11-06");
  });

  it("formats both people counts the same way", () => {
    const headline = peopleHeadline({
      active_authors_1d: 5000,
      new_authors: [{ day: "2026-11-06", count: 31218 }],
    });
    expect(headline).toContain("5K");
    expect(headline).not.toContain("31,218");
    expect(headline).toContain("31.2K");
  });
});
