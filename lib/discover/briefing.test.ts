import { describe, expect, it } from "vitest";

import {
  buildOverviewBriefing,
  noteLeadSentence,
  personLeadSentence,
} from "@/lib/discover/briefing";

const ahead = {
  metric: "unique_authors",
  window: "24h",
  value: 40,
  typical: 10,
  typical_basis: "entity_30d_median",
};

describe("lead sentences", () => {
  it("names the author of the leading note", () => {
    expect(noteLeadSentence("12 replies are still arriving", "Gigi")).toBe(
      "12 replies are still arriving on a note from Gigi."
    );
  });

  it("drops a note that is only recent", () => {
    expect(noteLeadSentence("Posted recently and already in this ranking", "Gigi")).toBeNull();
  });

  it("skips a person whose only reason is a post count or a day count", () => {
    expect(personLeadSentence("Published 6 notes in this window", "Ada")).toBeNull();
    expect(personLeadSentence("Active on 2 days in this window", "Ada")).toBeNull();
    expect(personLeadSentence("Gained 40 followers", "Ada")).toBe("Ada: gained 40 followers.");
  });
});

describe("buildOverviewBriefing", () => {
  it("leads with the note, then a person and a link that is actually ahead", () => {
    const briefing = buildOverviewBriefing({
      noteSentence: "12 replies are still arriving on a note from Gigi.",
      personSentence: "Ada: gained 40 followers.",
      hashtags: [
        { hashtag: "bitcoin", unique_authors: 993 },
        {
          hashtag: "music",
          unique_authors: 40,
          baseline: { ...ahead, value: 40, typical: 20 },
        },
      ],
      domains: [{ domain: "example.com", unique_authors: 40, baseline: ahead }],
    });
    expect(briefing?.headline).toBe("12 replies are still arriving on a note from Gigi.");
    expect(briefing?.items).toEqual([
      "Ada: gained 40 followers.",
      "example.com was shared by 40 people in this window, 4x its usual day.",
      "#music is in notes from 40 people in this window, 2x its usual day.",
    ]);
    expect(briefing?.coverage).toBeNull();
  });

  it("does not lead with a large topic that is flat or down", () => {
    expect(
      buildOverviewBriefing({
        hashtags: [
          { hashtag: "bitcoin", unique_authors: 993 },
          {
            hashtag: "nostr",
            unique_authors: 70,
            baseline: {
              metric: "unique_authors",
              value: 70,
              typical: 100,
              typical_basis: "entity_30d_median",
            },
          },
        ],
      })
    ).toBeNull();
  });

  it("uses a topic that is ahead of its usual day when nothing else is moving", () => {
    const briefing = buildOverviewBriefing({
      hashtags: [{ hashtag: "bitcoin", unique_authors: 40, baseline: ahead }],
    });
    expect(briefing?.headline).toBe(
      "#bitcoin is in notes from 40 people in this window, 4x its usual day."
    );
  });

  it("leads with a topic that is ahead and keeps relay concentration as coverage", () => {
    const briefing = buildOverviewBriefing({
      noteVolume: 100,
      noteVolumeBaseline: {
        metric: "note_volume",
        value: 100,
        typical: 80,
        typical_basis: "same_weekday_median",
      },
      hashtags: [{ hashtag: "bitcoin", unique_authors: 40, baseline: ahead }],
      networkSentence: "Three relays carried 91% of what we indexed in the last day.",
    });
    expect(briefing?.headline).toBe(
      "#bitcoin is in notes from 40 people in this window, 4x its usual day."
    );
    expect(briefing?.items[0]).toBe("100 notes, +25% vs a typical same weekday.");
    expect(briefing?.coverage).toBe("Three relays carried 91% of what we indexed in the last day.");
  });

  it("uses relay concentration as the headline only when nothing else is moving", () => {
    const briefing = buildOverviewBriefing({
      networkSentence: "Three relays carried 91% of what we indexed in the last day.",
    });
    expect(briefing?.headline).toBe("Three relays carried 91% of what we indexed in the last day.");
    expect(briefing?.items).toEqual([]);
    expect(briefing?.coverage).toBeNull();
  });

  it("leaves a baseline out when it describes a different count", () => {
    expect(
      buildOverviewBriefing({
        hashtags: [
          {
            hashtag: "bitcoin",
            unique_authors: 40,
            baseline: { ...ahead, value: 12, typical: 3 },
          },
        ],
      })
    ).toBeNull();
  });
});
