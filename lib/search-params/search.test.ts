import { describe, expect, it } from "vitest";

import { parseSearchQuery } from "@/lib/search-params/search";

describe("parseSearchQuery", () => {
  it("parses defaults for a bare query", () => {
    expect(parseSearchQuery({ q: "nostr" })).toEqual({
      q: "nostr",
      tab: "all",
      limit: 20,
      offset: 0,
      cursor: undefined,
    });
  });

  it("keeps a provided offset when no cursor is present", () => {
    const parsed = parseSearchQuery({ q: "nostr", tab: "notes", offset: "40" });
    expect(parsed.offset).toBe(40);
    expect(parsed.cursor).toBeUndefined();
  });

  it("prefers the cursor and zeroes the offset when both are present", () => {
    const parsed = parseSearchQuery({
      q: "nostr",
      tab: "notes",
      offset: "40",
      cursor: "opaque_token",
    });
    expect(parsed.cursor).toBe("opaque_token");
    expect(parsed.offset).toBe(0);
  });

  it("ignores blank cursors", () => {
    const parsed = parseSearchQuery({ q: "nostr", cursor: "   " });
    expect(parsed.cursor).toBeUndefined();
  });
});
