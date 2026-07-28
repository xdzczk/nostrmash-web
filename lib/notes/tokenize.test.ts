import { describe, expect, it } from "vitest";

import { encodeNevent, hexToNote, hexToNpub, hexToNsec } from "@/lib/nostr/nip19";
import { collectTokenReferences, tokenizeNoteContent } from "@/lib/notes/tokenize";

const PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const EVENT_ID = "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87";
const SECRET = "0000000000000000000000000000000000000000000000000000000000000001";

describe("tokenizeNoteContent", () => {
  it("keeps plain text", () => {
    expect(tokenizeNoteContent("hello world")).toEqual([{ type: "text", value: "hello world" }]);
  });

  it("tokenizes urls, hashtags, and mentions", () => {
    const npub = hexToNpub(PUBKEY)!;
    const tokens = tokenizeNoteContent(`Check https://example.com/path. and #Nostr hi ${npub}`);
    expect(tokens).toEqual([
      { type: "text", value: "Check " },
      { type: "url", value: "https://example.com/path", href: "https://example.com/path" },
      { type: "text", value: ". and " },
      { type: "hashtag", value: "#Nostr", tag: "nostr" },
      { type: "text", value: " hi " },
      { type: "mention", value: npub, pubkey: PUBKEY },
    ]);
  });

  it("tokenizes note/nevent refs and nostr: prefix", () => {
    const note = hexToNote(EVENT_ID)!;
    const nevent = encodeNevent({ id: EVENT_ID, author: PUBKEY, kind: 1 })!;
    const tokens = tokenizeNoteContent(`quote ${note} and nostr:${nevent}`);
    expect(tokens.map((t) => t.type)).toEqual(["text", "event", "text", "event"]);
    expect(tokens[1]).toMatchObject({ type: "event", id: EVENT_ID });
    expect(tokens[3]).toMatchObject({ type: "event", id: EVENT_ID, author: PUBKEY, kind: 1 });
  });

  it("redacts nsec secrets", () => {
    const nsec = hexToNsec(SECRET)!;
    const tokens = tokenizeNoteContent(`secret ${nsec}`);
    expect(tokens).toEqual([
      { type: "text", value: "secret " },
      { type: "redacted", value: nsec, reason: "nsec" },
    ]);
  });
});

describe("collectTokenReferences", () => {
  it("collects pubkeys and event ids", () => {
    const npub = hexToNpub(PUBKEY)!;
    const note = hexToNote(EVENT_ID)!;
    const refs = collectTokenReferences(tokenizeNoteContent(`${npub} ${note}`));
    expect(refs.pubkeys).toEqual([PUBKEY]);
    expect(refs.eventIds).toEqual([EVENT_ID]);
  });
});
