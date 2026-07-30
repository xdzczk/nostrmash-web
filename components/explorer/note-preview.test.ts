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
});
