import { describe, expect, it } from "vitest";

import { archiveNeighbors, latestArchiveDay, readArchiveDay } from "@/lib/discover/archive";

describe("archive days", () => {
  it("reads a stored overview and drops rows without an author count", () => {
    const day = readArchiveDay({
      day: "2026-07-29",
      hashtags: [{ hashtag: "bitcoin", unique_authors: 40 }],
      domains: [{ domain: "", unique_authors: 3 }, { domain: "example.com" }],
      network: { note_volume: 100, active_authors: 20 },
    });
    expect(day?.hashtags).toEqual([{ label: "bitcoin", uniqueAuthors: 40, baseline: null }]);
    expect(day?.domains).toEqual([]);
    expect(day?.noteVolume).toBe(100);
  });

  it("picks the newest day that is not in the future", () => {
    expect(latestArchiveDay(["2026-07-01", "2026-07-29", "2999-01-01"], "2026-07-30")).toBe(
      "2026-07-29"
    );
  });

  it("links only to days that exist, and never past today", () => {
    expect(
      archiveNeighbors(["2026-07-28", "2026-07-30", "2026-07-29"], "2026-07-29", "2026-07-29")
    ).toEqual({
      previous: "2026-07-28",
      next: null,
    });
  });
});
