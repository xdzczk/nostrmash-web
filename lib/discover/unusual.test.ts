import { describe, expect, it } from "vitest";

import { unusualDomains, unusualHashtags } from "@/lib/discover/unusual";

const ahead = {
  metric: "unique_authors",
  window: "24h",
  value: 40,
  typical: 10,
  typical_basis: "entity_30d_median",
};

describe("unusual lists", () => {
  it("keeps a topic only when today is ahead of its usual day", () => {
    expect(
      unusualHashtags(
        [
          { hashtag: "bitcoin", status: "emerging" },
          { hashtag: "music", status: "emerging" },
          { hashtag: "basspistol", status: "emerging" },
        ],
        [
          {
            hashtag: "bitcoin",
            unique_authors: 70,
            baseline: { ...ahead, value: 70, typical: 100 },
          },
          { hashtag: "music", unique_authors: 40, baseline: ahead },
        ]
      )
    ).toEqual([{ label: "music", detail: "4x its usual day." }]);
  });

  it("drops a link that has no usual day to compare with", () => {
    expect(
      unusualDomains(
        [
          { domain: "sshhole.com", status: "emerging" },
          { domain: "Example.com", status: "emerging" },
        ],
        [{ domain: "example.com", unique_authors: 40, baseline: ahead }]
      )
    ).toEqual([{ label: "example.com", detail: "4x its usual day." }]);
  });
});
