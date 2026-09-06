import { describe, expect, it } from "vitest";

import { extractHashtagsFromText, extractUrls } from "@/lib/notes/text";

describe("extractUrls", () => {
  it("strips trailing punctuation and dedupes", () => {
    expect(extractUrls("See https://example.com/path. and https://example.com/path")).toEqual([
      "https://example.com/path",
    ]);
  });
});

describe("extractHashtagsFromText", () => {
  it("matches tokenizer rules", () => {
    expect(extractHashtagsFromText("hello #Nostr and foo#ignored plus #tag_one")).toEqual([
      "nostr",
      "tag_one",
    ]);
  });
});
