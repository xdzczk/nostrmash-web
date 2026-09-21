import { describe, expect, it } from "vitest";

import {
  MAX_LIST_LIMIT,
  buildContinuationHref,
  nextShowMoreLimit,
} from "@/lib/search-params/pagination";

describe("nextShowMoreLimit", () => {
  it("grows the default page size toward the backend cap", () => {
    expect(nextShowMoreLimit(20)).toBe(60);
    expect(nextShowMoreLimit(60)).toBe(100);
  });

  it("clamps the final step to the cap", () => {
    expect(nextShowMoreLimit(80)).toBe(100);
  });

  it("returns undefined at or beyond the cap", () => {
    expect(nextShowMoreLimit(100)).toBeUndefined();
    expect(nextShowMoreLimit(150)).toBeUndefined();
  });

  it("exposes the backend cap", () => {
    expect(MAX_LIST_LIMIT).toBe(100);
  });
});

describe("buildContinuationHref", () => {
  it("preserves existing params while setting the continuation key", () => {
    const current = new URLSearchParams({ cursor: "abc", limit: "20" });
    expect(buildContinuationHref("/hashtags/nostr/notes", current, "limit", "60")).toBe(
      "/hashtags/nostr/notes?cursor=abc&limit=60"
    );
  });

  it("drops the key when no value is provided", () => {
    const current = new URLSearchParams({ cursor: "abc" });
    expect(buildContinuationHref("/hashtags/nostr/notes", current, "cursor")).toBe(
      "/hashtags/nostr/notes"
    );
  });
});
