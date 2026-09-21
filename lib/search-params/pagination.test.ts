import { describe, expect, it } from "vitest";

import { MAX_LIST_LIMIT, buildContinuationHref } from "@/lib/search-params/pagination";

describe("MAX_LIST_LIMIT", () => {
  it("matches the backend per-request cap", () => {
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
