import { describe, expect, it } from "vitest";

import {
  isValidDomainParam,
  isValidEventIdParam,
  isValidPubkeyOrNpubParam,
  isValidRelayHostParam,
} from "@/lib/routing/params";

describe("route param validators", () => {
  it("accepts hex and note/nevent event ids", () => {
    expect(isValidEventIdParam("a".repeat(64))).toBe(true);
    expect(isValidEventIdParam("note1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq")).toBe(true);
    expect(isValidEventIdParam("nevent1qqqqqqqqqqqqqqqqqqqqqqqqqqqqq")).toBe(true);
    expect(isValidEventIdParam("not-an-id")).toBe(false);
    expect(isValidEventIdParam("")).toBe(false);
  });

  it("accepts hex pubkeys and valid npubs", () => {
    expect(isValidPubkeyOrNpubParam("e".repeat(64))).toBe(true);
    expect(isValidPubkeyOrNpubParam("npub1invalid")).toBe(false);
    expect(isValidPubkeyOrNpubParam("")).toBe(false);
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
