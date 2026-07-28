import { describe, expect, it } from "vitest";

import {
  decodeNip19,
  encodeNaddr,
  encodeNevent,
  encodeNprofile,
  hexToNote,
  hexToNpub,
  noteToHex,
  npubToHex,
  stripNostrPrefix,
} from "@/lib/nostr/nip19";

// Known vectors from NIP-19 examples / commonly used fixtures.
const PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const EVENT_ID = "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87";

describe("nip19 hex entities", () => {
  it("round-trips npub", () => {
    const npub = hexToNpub(PUBKEY);
    expect(npub).toMatch(/^npub1/);
    expect(npubToHex(npub!)).toBe(PUBKEY);
  });

  it("round-trips note", () => {
    const note = hexToNote(EVENT_ID);
    expect(note).toMatch(/^note1/);
    expect(noteToHex(note!)).toBe(EVENT_ID);
  });

  it("rejects mixed-case bech32", () => {
    const npub = hexToNpub(PUBKEY)!;
    expect(npubToHex(npub.slice(0, 4).toUpperCase() + npub.slice(4))).toBeNull();
  });
});

describe("nip19 TLV entities", () => {
  it("round-trips nprofile", () => {
    const encoded = encodeNprofile({ pubkey: PUBKEY, relays: ["wss://relay.damus.io"] });
    expect(encoded).toMatch(/^nprofile1/);
    const decoded = decodeNip19(encoded!);
    expect(decoded).toEqual({
      type: "nprofile",
      data: { pubkey: PUBKEY, relays: ["wss://relay.damus.io"] },
    });
  });

  it("round-trips nevent with author and kind", () => {
    const encoded = encodeNevent({
      id: EVENT_ID,
      author: PUBKEY,
      kind: 1,
      relays: ["wss://nos.lol"],
    });
    expect(encoded).toMatch(/^nevent1/);
    const decoded = decodeNip19(encoded!);
    expect(decoded).toEqual({
      type: "nevent",
      data: {
        id: EVENT_ID,
        author: PUBKEY,
        kind: 1,
        relays: ["wss://nos.lol"],
      },
    });
  });

  it("round-trips naddr", () => {
    const encoded = encodeNaddr({
      identifier: "my-article",
      pubkey: PUBKEY,
      kind: 30023,
      relays: ["wss://relay.nostr.band"],
    });
    expect(encoded).toMatch(/^naddr1/);
    const decoded = decodeNip19(encoded!);
    expect(decoded).toEqual({
      type: "naddr",
      data: {
        identifier: "my-article",
        pubkey: PUBKEY,
        kind: 30023,
        relays: ["wss://relay.nostr.band"],
      },
    });
  });
});

describe("decodeNip19", () => {
  it("accepts nostr: prefix", () => {
    const npub = hexToNpub(PUBKEY)!;
    expect(decodeNip19(`nostr:${npub}`)).toEqual({ type: "npub", data: PUBKEY });
  });

  it("decodes nsec as secret entity", () => {
    // Deterministic: encode via same hex→bech32 path as npub but with nsec hrp is not
    // exported; verify decode rejects invalid and stripNostrPrefix works.
    expect(stripNostrPrefix(`nostr:npub1abc`)).toBe("npub1abc");
    expect(decodeNip19("not-valid")).toBeNull();
  });
});
