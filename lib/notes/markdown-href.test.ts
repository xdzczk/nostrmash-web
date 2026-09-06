import { describe, expect, it } from "vitest";

import { hexToNpub, hexToNote } from "@/lib/nostr/nip19";
import { markdownHref } from "@/lib/notes/markdown-href";

const PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const EVENT_ID = "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87";

describe("markdownHref", () => {
  it("keeps http(s) and rejects javascript", () => {
    expect(markdownHref("https://example.com/a")).toBe("https://example.com/a");
    expect(markdownHref("javascript:alert(1)")).toBeNull();
  });

  it("maps nostr identifiers onto app routes", () => {
    const npub = hexToNpub(PUBKEY)!;
    const note = hexToNote(EVENT_ID)!;
    expect(markdownHref(`nostr:${npub}`)).toBe(`/profiles/${encodeURIComponent(npub)}`);
    expect(markdownHref(note)).toBe(`/notes/${encodeURIComponent(EVENT_ID)}`);
  });
});
