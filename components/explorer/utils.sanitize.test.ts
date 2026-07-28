import { describe, expect, it } from "vitest";

import { normalizeImageSrc, sanitizeExternalHref } from "@/components/explorer/utils";

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
