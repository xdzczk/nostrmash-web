import { describe, expect, it } from "vitest";

import {
  isNextImageCompatibleSrc,
  normalizeImageSrc,
  profileFallbackAvatarDataUrl,
  profileInitial,
  profileLabel,
  profilePictureUrl,
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

describe("isNextImageCompatibleSrc", () => {
  it("allows https and local http", () => {
    expect(isNextImageCompatibleSrc("https://cdn.example/a.png")).toBe(true);
    expect(isNextImageCompatibleSrc("http://localhost:3000/a.png")).toBe(true);
    expect(isNextImageCompatibleSrc("http://127.0.0.1/a.png")).toBe(true);
    expect(isNextImageCompatibleSrc("data:image/png;base64,abc")).toBe(true);
  });

  it("rejects cleartext remote http hosts that would crash next/image", () => {
    expect(isNextImageCompatibleSrc("http://thebitcoinblockclock.com/a.jpg")).toBe(false);
  });
});

describe("profilePictureUrl", () => {
  it("falls back to null for http profile pictures outside localhost", () => {
    expect(
      profilePictureUrl({
        pubkey: "a".repeat(64),
        picture: "http://thebitcoinblockclock.com/assets/img/bg-masthead.jpg",
      })
    ).toBeNull();
  });
});

describe("profileFallbackAvatarDataUrl", () => {
  it("keeps emoji-leading display names encodeable for next/image data URLs", () => {
    const profile = {
      pubkey: "c".repeat(64),
      display_name: "⚡Satoshi",
    };
    expect(profileInitial(profile)).toBe("⚡");
    expect(() => profileFallbackAvatarDataUrl(profile)).not.toThrow();
    expect(profileFallbackAvatarDataUrl(profile).startsWith("data:image/svg+xml")).toBe(true);
  });

  it("does not throw on lone surrogate initials", () => {
    const highSurrogate = "\uD83D";
    const profile = {
      pubkey: "d".repeat(64),
      display_name: `${highSurrogate}broken`,
    };
    expect(profileInitial(profile)).toBe("?");
    expect(() => profileFallbackAvatarDataUrl(profile)).not.toThrow();
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
