import { describe, expect, it } from "vitest";

import { isValidHashtag, normalizeHashtagQuery } from "@/lib/hashtags";

describe("hashtag validation", () => {
  it("accepts normal hashtags", () => {
    expect(normalizeHashtagQuery("#Bitcoin")).toBe("bitcoin");
    expect(isValidHashtag("nostr")).toBe(true);
    expect(isValidHashtag("darrin_baker")).toBe(true);
  });

  it("rejects display names and spaces", () => {
    expect(isValidHashtag("darrin baker")).toBe(false);
    expect(isValidHashtag("")).toBe(false);
    expect(() => normalizeHashtagQuery("darrin baker")).toThrow(/invalid hashtag/i);
  });
});
