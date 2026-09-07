import { describe, expect, it } from "vitest";

import {
  encodeNaddr,
  encodeNevent,
  encodeNprofile,
  hexToNote,
  hexToNpub,
  hexToNsec,
} from "@/lib/nostr/nip19";
import { extractHashtagsFromNote } from "@/components/explorer/utils";
import { collectTokenReferences, tokenizeNoteContent } from "@/lib/notes/tokenize";

const PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const EVENT_ID = "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87";
const SECRET = "0000000000000000000000000000000000000000000000000000000000000001";

describe("tokenizeNoteContent", () => {
  it("keeps plain text", () => {
    expect(tokenizeNoteContent("hello world")).toEqual([{ type: "text", value: "hello world" }]);
  });

  it("tokenizes schemeless hosts as https links", () => {
    const tokens = tokenizeNoteContent(
      "Try YakBak.app, notes.md, bob@example.com, and @foundation.xyz"
    );
    expect(tokens.filter((token) => token.type === "url")).toEqual([
      { type: "url", value: "YakBak.app", href: "https://yakbak.app/" },
    ]);
    expect(
      tokens.some((token) => token.type === "handle" && token.handle === "foundation.xyz")
    ).toBe(true);
    expect(tokens.some((token) => token.type === "text" && token.value.includes("notes.md"))).toBe(
      true
    );
    expect(
      tokens.some((token) => token.type === "text" && token.value.includes("bob@example.com"))
    ).toBe(true);
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

  it("consumes a leading @ before npub mentions", () => {
    const npub = hexToNpub(PUBKEY)!;
    const tokens = tokenizeNoteContent(`hi @${npub} there`);
    expect(tokens).toEqual([
      { type: "text", value: "hi " },
      { type: "mention", value: npub, pubkey: PUBKEY },
      { type: "text", value: " there" },
    ]);
  });

  it("tokenizes naddr refs", () => {
    const naddr = encodeNaddr({ identifier: "hello", pubkey: PUBKEY, kind: 30023 })!;
    const tokens = tokenizeNoteContent(`see ${naddr}`);
    expect(tokens.map((token) => token.type)).toEqual(["text", "address"]);
    expect(tokens[1]).toMatchObject({
      type: "address",
      identifier: "hello",
      pubkey: PUBKEY,
      kind: 30023,
    });
  });

  it("keeps inline and footer hashtag extraction in sync", () => {
    const content = "hello #Nostr and foo#ignored plus #tag_one";
    const inline = tokenizeNoteContent(content)
      .filter((token) => token.type === "hashtag")
      .map((token) => (token.type === "hashtag" ? token.tag : ""));
    expect(extractHashtagsFromNote({ id: EVENT_ID, content })).toEqual(inline);
  });

  it("redacts nsec secrets", () => {
    const nsec = hexToNsec(SECRET)!;
    const tokens = tokenizeNoteContent(`secret ${nsec}`);
    expect(tokens).toEqual([
      { type: "text", value: "secret " },
      { type: "redacted", value: nsec, reason: "nsec" },
    ]);
  });

  it("decodes a long nostr:nprofile mention without cutting the bech32", () => {
    const nprofile = encodeNprofile({
      pubkey: PUBKEY,
      relays: [
        "wss://relay.damus.io",
        "wss://nos.lol",
        "wss://relay.primal.net",
        "wss://relay.snort.social",
      ],
    })!;
    expect(nprofile.length).toBeGreaterThanOrEqual(128);
    const tokens = tokenizeNoteContent(`Cool to see nostr:${nprofile}`);
    expect(tokens).toEqual([
      { type: "text", value: "Cool to see " },
      {
        type: "mention",
        value: `nostr:${nprofile}`,
        pubkey: PUBKEY,
        relays: [
          "wss://relay.damus.io",
          "wss://nos.lol",
          "wss://relay.primal.net",
          "wss://relay.snort.social",
        ],
      },
    ]);
  });

  it("resolves NIP-08 #[n] pointers from event tags", () => {
    const tokens = tokenizeNoteContent("Thanks #[0] for the note #[1] and article #[2]", {
      tags: [
        ["p", PUBKEY],
        ["e", EVENT_ID],
        ["a", `30023:${PUBKEY}:hello`],
      ],
    });
    expect(tokens).toEqual([
      { type: "text", value: "Thanks " },
      { type: "mention", value: "#[0]", pubkey: PUBKEY },
      { type: "text", value: " for the note " },
      { type: "event", value: "#[1]", id: EVENT_ID },
      { type: "text", value: " and article " },
      { type: "address", value: "#[2]", identifier: "hello", pubkey: PUBKEY, kind: 30023 },
    ]);
  });

  it("tokenizes bare @handles and leaves emails alone", () => {
    const tokens = tokenizeNoteContent("Hi @Zapstore and write bob@example.com later");
    expect(tokens).toEqual([
      { type: "text", value: "Hi " },
      { type: "handle", value: "@Zapstore", handle: "Zapstore" },
      { type: "text", value: " and write bob@example.com later" },
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
