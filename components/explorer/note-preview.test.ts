import { describe, expect, it } from "vitest";

import { hexToNote, hexToNpub } from "@/lib/nostr/nip19";

import { getEditorialNoteText } from "./note-preview";

const PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const EVENT_ID = "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87";

describe("getEditorialNoteText", () => {
  it("resolves mentions to @name and truncates event refs", () => {
    const npub = hexToNpub(PUBKEY)!;
    const note = hexToNote(EVENT_ID)!;
    const resolved = getEditorialNoteText(
      {
        id: "a".repeat(64),
        content: `Read ${npub} and nostr:${note}`,
      },
      {
        profilesByPubkey: {
          [PUBKEY]: { pubkey: PUBKEY, display_name: "Alice" },
        },
      }
    );

    expect(resolved).toContain("@Alice");
    expect(resolved).not.toContain(npub);
    expect(resolved).not.toMatch(/nostr:/);
    expect(resolved.length).toBeLessThan(npub.length + note.length);
  });

  it("truncates leftover identifier-heavy tokens", () => {
    const text = getEditorialNoteText({
      id: "a".repeat(64),
      content: `Read ${`npub1${"x".repeat(58)}`} and nostr:${`note1${"y".repeat(58)}`}`,
    });

    expect(text).not.toMatch(/npub1x{20,}/);
    expect(text).not.toMatch(/note1y{20,}/);
    expect(text).not.toContain("Nostr reference");
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
