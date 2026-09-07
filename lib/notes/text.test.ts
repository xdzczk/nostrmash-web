import { describe, expect, it } from "vitest";

import { extractHashtagsFromText, extractLinkableUrls, extractUrls } from "@/lib/notes/text";

describe("extractUrls", () => {
  it("strips trailing punctuation and dedupes", () => {
    expect(extractUrls("See https://example.com/path. and https://example.com/path")).toEqual([
      "https://example.com/path",
    ]);
  });

  it("does not treat schemeless hosts as preview/media urls", () => {
    expect(extractUrls("Visit YakBak.app and notes.md")).toEqual([]);
  });
});

describe("extractLinkableUrls", () => {
  it("rewrites schemeless hosts to https and skips emails, mentions, and files", () => {
    expect(
      extractLinkableUrls(
        "See YakBak.app, notes.md, bob@example.com, @foundation.xyz, and https://example.com/path."
      )
    ).toEqual(["https://example.com/path", "https://yakbak.app/"]);
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
