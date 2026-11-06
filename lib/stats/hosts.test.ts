import { describe, expect, it } from "vitest";

import { bareHost, mergeHostCounts } from "@/lib/stats/hosts";

describe("media hosts", () => {
  it("strips the scheme and trailing slash and merges duplicates", () => {
    expect(bareHost("https://CDN.Example/path/")).toBe("cdn.example");
    expect(bareHost("blossom.example/")).toBe("blossom.example");
    expect(
      mergeHostCounts([
        { host: "https://cdn.example/", count: 2 },
        { host: "CDN.example", count: 3 },
        { host: "other.example", count: 1 },
      ])
    ).toEqual([
      { host: "cdn.example", count: 5 },
      { host: "other.example", count: 1 },
    ]);
  });
});
