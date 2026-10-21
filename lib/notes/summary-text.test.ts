import { describe, expect, it } from "vitest";

import { collapsePreviewWhitespace, summarizeNoteText } from "./summary-text";

describe("collapsePreviewWhitespace", () => {
  it("folds paragraph breaks and runs of spaces into single spaces", () => {
    expect(collapsePreviewWhitespace("TITLE\n\n  Body line one.\nLine two.  ")).toBe(
      "TITLE Body line one. Line two."
    );
  });
});

describe("summarizeNoteText", () => {
  it("strips media URLs and collapses whitespace", () => {
    const input =
      "YOUTUBE JUST BANNED SIMPLY BITCOIN\n\nWe bootstrapped this.\n\nhttps://blossom.primal.net/5bdfdffb38c0b9d6e6d8e8cf43ef74fd3329657ad1ecc567bf5b4a69e235480e.jpg";
    expect(summarizeNoteText(input)).toBe(
      "YOUTUBE JUST BANNED SIMPLY BITCOIN We bootstrapped this."
    );
  });

  it("reduces page links to their host and removes nostr references", () => {
    const input =
      "Read https://www.404media.co/dhs-said-they-lied/ and nostr:nevent1qqsabcdefghijklmnopqrstuvwxyz0123456789 then note1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
    expect(summarizeNoteText(input)).toBe("Read 404media.co and then");
  });

  it("truncates at a word boundary with an ellipsis", () => {
    const input = "The amount of people building right now is remarkable and keeps growing";
    const result = summarizeNoteText(input, 40);
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result).toBe("The amount of people building right now…");
  });

  it("never ends in trailing punctuation before the ellipsis", () => {
    expect(summarizeNoteText("Hello, world. This is a test, okay?", 14)).toBe("Hello, world…");
  });

  it("returns an empty string for non-string input", () => {
    expect(summarizeNoteText(undefined)).toBe("");
    expect(summarizeNoteText(42)).toBe("");
  });
});
