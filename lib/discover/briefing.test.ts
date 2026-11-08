import { describe, expect, it } from "vitest";

import { buildOverviewBriefing } from "@/lib/discover/briefing";

describe("buildOverviewBriefing", () => {
  it("leads with the topic the most authors used, without inventing a ratio", () => {
    const briefing = buildOverviewBriefing({
      hashtags: [
        { hashtag: "bitcoin", unique_authors: 993 },
        { hashtag: "nostr", unique_authors: 120 },
      ],
      domains: [{ domain: "example.com", unique_authors: 31 }],
      risingSentence: "Gained 40 followers.",
    });
    expect(briefing?.headline).toBe("#bitcoin is in notes from 993 people in this window.");
    expect(briefing?.items).toEqual([
      "#nostr is in notes from 120 people in this window.",
      "example.com was shared by 31 people in this window.",
      "Gained 40 followers.",
    ]);
    expect(briefing?.headline).not.toMatch(/x usual|below usual/);
  });

  it("returns null when no row has a usable count", () => {
    expect(buildOverviewBriefing({ hashtags: [{ hashtag: "x", unique_authors: 1 }] })).toBeNull();
  });
});
