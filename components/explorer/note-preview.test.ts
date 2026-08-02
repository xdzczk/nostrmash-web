import { describe, expect, it } from "vitest";

import { getEditorialNoteText } from "./note-preview";

describe("getEditorialNoteText", () => {
  it("removes protocol identifiers from primary editorial copy", () => {
    const text = getEditorialNoteText({
      id: "a".repeat(64),
      content: `Read ${`npub1${"x".repeat(58)}`} and nostr:${`note1${"y".repeat(58)}`}`,
    });

    expect(text).not.toMatch(/npub1|note1|nostr:/);
    expect(text).toContain("Nostr reference");
  });

  it("removes media file urls from editorial copy", () => {
    const text = getEditorialNoteText({
      id: "b".repeat(64),
      content: "Look at this https://cdn.example/photo.png nice",
    });

    expect(text).toBe("Look at this nice");
    expect(text).not.toMatch(/https?:\/\/|photo\.png/i);
  });

  it("removes compact media host placeholders from API preview copy", () => {
    const text = getEditorialNoteText({
      id: "c".repeat(64),
      content:
        "GM ☕️\nhttps://blossom.primal.net/67abe3541726675f55edbcb2bf134c1d15c23bd1db0ba31b7e2aa4b4ddce7c78.jpg",
      preview: {
        mode: "media_led_preview",
        display_content: "GM ☕️ [blossom.primal.net]",
        contains_raw: false,
        is_compact: false,
        domains: ["blossom.primal.net"],
      },
    } as never);

    expect(text).toBe("GM ☕️");
    expect(text).not.toContain("blossom.primal.net");
  });
});
