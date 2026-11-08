import { describe, expect, it } from "vitest";

import { mapDomainWhyNow, mapHashtagWhyNow } from "@/components/explorer/why-now";

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
