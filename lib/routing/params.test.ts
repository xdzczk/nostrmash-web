import { describe, expect, it } from "vitest";

import { hexToNote, hexToNpub } from "@/lib/nostr/nip19";
import {
  isValidDomainParam,
  isValidEventIdParam,
  isValidPubkeyOrNpubParam,
  isValidRelayHostParam,
  resolveEventIdParam,
  resolvePubkeyParam,
} from "@/lib/routing/params";

const PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const EVENT_ID = "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87";

describe("route param validators", () => {
  it("accepts hex and note/nevent event ids", () => {
    expect(isValidEventIdParam("a".repeat(64))).toBe(true);
    const note = hexToNote(EVENT_ID)!;
    expect(isValidEventIdParam(note)).toBe(true);
    expect(isValidEventIdParam(`nostr:${note}`)).toBe(true);
    expect(isValidEventIdParam("not-an-id")).toBe(false);
    expect(isValidEventIdParam("")).toBe(false);
  });

  it("accepts hex pubkeys and valid npubs (including nostr: prefix)", () => {
    expect(isValidPubkeyOrNpubParam("e".repeat(64))).toBe(true);
    const npub = hexToNpub(PUBKEY)!;
    expect(isValidPubkeyOrNpubParam(npub)).toBe(true);
    expect(isValidPubkeyOrNpubParam(`nostr:${npub}`)).toBe(true);
    expect(isValidPubkeyOrNpubParam("npub1invalid")).toBe(false);
    expect(isValidPubkeyOrNpubParam("")).toBe(false);
  });

  it("resolves event/pubkey params to hex", () => {
    expect(resolveEventIdParam(EVENT_ID)).toBe(EVENT_ID);
    expect(resolveEventIdParam(`nostr:${hexToNote(EVENT_ID)!}`)).toBe(EVENT_ID);
    expect(resolvePubkeyParam(PUBKEY)).toBe(PUBKEY);
    expect(resolvePubkeyParam(`nostr:${hexToNpub(PUBKEY)!}`)).toBe(PUBKEY);
  });

  it("accepts hostnames for domains", () => {
    expect(isValidDomainParam("example.com")).toBe(true);
    expect(isValidDomainParam("sub.example.co.uk")).toBe(true);
    expect(isValidDomainParam("https://example.com/path")).toBe(false);
    expect(isValidDomainParam("not a domain")).toBe(false);
  });

  it("accepts relay hosts with optional ports", () => {
    expect(isValidRelayHostParam("relay.damus.io")).toBe(true);
    expect(isValidRelayHostParam("relay.example.com:443")).toBe(true);
    expect(isValidRelayHostParam("wss://relay.damus.io")).toBe(true);
    expect(isValidRelayHostParam("relay.example.com/path")).toBe(false);
  });
});
