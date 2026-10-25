import { describe, expect, it } from "vitest";

import { resolveSearchIntent } from "@/lib/search/intent";

const HEX = "a".repeat(64);

describe("resolveSearchIntent", () => {
  it("sends a hashtag to the hashtag notes page", () => {
    expect(resolveSearchIntent(" #Bitcoin ")).toEqual({
      kind: "hashtag",
      normalized: "bitcoin",
      href: "/hashtags/bitcoin/notes",
    });
  });

  it("sends a relay URL to the relay host", () => {
    const intent = resolveSearchIntent("wss://relay.damus.io");
    expect(intent.kind).toBe("relay");
    expect(intent.href).toBe("/relays/relay.damus.io");
  });

  it("sends a bare hostname to the domain page", () => {
    expect(resolveSearchIntent("github.com")).toMatchObject({
      kind: "domain",
      normalized: "github.com",
      href: "/domains/github.com",
    });
  });

  it("leaves a 64-hex string on search because it may be a note or a pubkey", () => {
    expect(resolveSearchIntent(HEX)).toEqual({ kind: "hex", normalized: HEX });
  });

  it("leaves ordinary text, including a misspelling, on search", () => {
    expect(resolveSearchIntent("bitconi")).toEqual({ kind: "text", normalized: "bitconi" });
  });

  it("does not route a secret key", () => {
    const intent = resolveSearchIntent(
      "nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqz8m3v7"
    );
    expect(intent.kind).not.toBe("profile");
    expect(intent.href).toBeUndefined();
  });
});
