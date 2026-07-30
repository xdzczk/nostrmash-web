import { describe, expect, it } from "vitest";

import {
  normalizeImageSrc,
  profileLabel,
  profileSecondaryLabel,
  sanitizeExternalHref,
} from "@/components/explorer/utils";

describe("sanitizeExternalHref", () => {
  it("allows http(s) and relative paths", () => {
    expect(sanitizeExternalHref("https://example.com/path")).toBe("https://example.com/path");
    expect(sanitizeExternalHref("http://example.com")).toBe("http://example.com/");
    expect(sanitizeExternalHref("/profiles/abc")).toBe("/profiles/abc");
  });

  it("rejects dangerous schemes", () => {
    expect(sanitizeExternalHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeExternalHref("data:text/html,<script>")).toBeNull();
    expect(sanitizeExternalHref("vbscript:msgbox(1)")).toBeNull();
    expect(sanitizeExternalHref("//evil.example/path")).toBeNull();
  });
});

describe("normalizeImageSrc", () => {
  it("accepts https and protocol-relative hosts", () => {
    expect(normalizeImageSrc("https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(normalizeImageSrc("//cdn.example/a.png")).toBe("https://cdn.example/a.png");
  });

  it("rejects javascript image sources", () => {
    expect(normalizeImageSrc("javascript:alert(1)")).toBeNull();
  });
});

describe("profile identity presentation", () => {
  it("suppresses malformed display metadata in favor of a stable identifier", () => {
    const profile = {
      pubkey: "a".repeat(64),
      npub: "npub1stableidentifier",
      display_name: "bad\ufffdname",
      name: "%7Bencoded%7D",
      nip05: "bad identity@example.com",
    };

    expect(profileLabel(profile)).toBe("npub1stableidentifier");
    expect(profileSecondaryLabel(profile)).not.toContain("bad identity");
  });

  it("preserves readable unicode names", () => {
    expect(profileLabel({ pubkey: "b".repeat(64), display_name: "Иван ⚡" })).toBe("Иван ⚡");
  });
});
