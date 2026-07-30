import { describe, expect, it } from "vitest";

import { normalizeDomainEntries } from "@/lib/api/normalize/entities";

describe("normalizeDomainEntries", () => {
  it("prefers canonical backend identity when provided", () => {
    expect(
      normalizeDomainEntries([
        {
          domain: "youtu.be",
          canonical_domain: "youtube.com",
          event_count: 12,
        },
      ])
    ).toMatchObject([{ domain: "youtube.com", count: 12 }]);
  });

  it("temporarily suppresses duplicate aliases without merging counts", () => {
    expect(
      normalizeDomainEntries([
        { domain: "www.example.com", count: 3 },
        { domain: "example.com", count: 8 },
        { domain: "youtu.be", count: 4 },
        { domain: "youtube.com", count: 7 },
      ])
    ).toEqual([
      expect.objectContaining({ domain: "example.com", count: 8 }),
      expect.objectContaining({ domain: "youtube.com", count: 7 }),
    ]);
  });
});
