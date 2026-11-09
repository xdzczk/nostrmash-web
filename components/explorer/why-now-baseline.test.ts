import { describe, expect, it } from "vitest";

import { mapDomainWhyNow, mapHashtagWhyNow, mapProfileWhyNow } from "@/components/explorer/why-now";

const baseline = {
  metric: "unique_authors",
  window: "24h",
  value: 40,
  typical: 10,
  typical_basis: "entity_30d_median",
};

describe("why-now baselines", () => {
  it("folds the comparison into the author sentence", () => {
    expect(mapHashtagWhyNow({ hashtag: "bitcoin", unique_authors: 40, baseline })[0]?.text).toBe(
      "Used by 40 people, 4x its usual day"
    );
  });

  it("adds the comparison after a server reason without repeating the count", () => {
    const reasons = mapDomainWhyNow({
      domain: "example.com",
      unique_authors: 40,
      baseline,
      ranking: {
        rank: 1,
        score: 1,
        reasons: [{ code: "source_breadth", evidence: [{ metric: "unique_authors", value: 40 }] }],
      },
    });
    expect(reasons.at(-1)?.text).toBe("4x its usual day");
    expect(reasons[0]?.text).not.toMatch(/4x/);
  });
});

describe("profile why-now", () => {
  it("drops a post count even when it is the only reason", () => {
    expect(
      mapProfileWhyNow({
        pubkey: "a".repeat(64),
        ranking: {
          rank: 1,
          score: 1,
          reasons: [
            {
              code: "publishing_momentum",
              evidence: [{ metric: "posts", value: 2, unit: "notes" }],
            },
          ],
        },
      })
    ).toEqual([]);
  });

  it("keeps a stronger reason when a post count is also present", () => {
    expect(
      mapProfileWhyNow({
        pubkey: "a".repeat(64),
        ranking: {
          rank: 1,
          score: 1,
          reasons: [
            {
              code: "publishing_momentum",
              evidence: [{ metric: "posts", value: 6, unit: "notes" }],
            },
            {
              code: "engagement_quality",
              evidence: [{ metric: "x", value: 15, unit: "interactions per note" }],
            },
          ],
        },
      }).map((reason) => reason.text)
    ).toEqual(["Each note gets about 15 reactions, replies, and zaps"]);
  });
});
