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

  it("adds the stored comparison when it describes the same author count", () => {
    const briefing = buildOverviewBriefing({
      hashtags: [
        {
          hashtag: "bitcoin",
          unique_authors: 40,
          baseline: {
            metric: "unique_authors",
            window: "24h",
            value: 40,
            typical: 10,
            typical_basis: "entity_30d_median",
          },
        },
      ],
    });
    expect(briefing?.headline).toBe(
      "#bitcoin is in notes from 40 people in this window, 4x its usual day."
    );
  });

  it("leaves the count alone when the baseline is for a different value", () => {
    const briefing = buildOverviewBriefing({
      hashtags: [
        {
          hashtag: "bitcoin",
          unique_authors: 40,
          baseline: {
            metric: "unique_authors",
            value: 12,
            typical: 3,
            typical_basis: "entity_30d_median",
          },
        },
      ],
    });
    expect(briefing?.headline).toBe("#bitcoin is in notes from 40 people in this window.");
  });

  it("returns null when no row has a usable count", () => {
    expect(buildOverviewBriefing({ hashtags: [{ hashtag: "x", unique_authors: 1 }] })).toBeNull();
  });
});
