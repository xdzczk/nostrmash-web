import { describe, expect, it } from "vitest";

import {
  clampSuggestLimit,
  clampSuggestQuery,
  clientIpFromRequest,
} from "@/lib/api/search-suggest-params";

describe("search suggest params", () => {
  it("clamps query length and trims whitespace", () => {
    expect(clampSuggestQuery("  bitcoin  ")).toBe("bitcoin");
    expect(clampSuggestQuery("a".repeat(80))).toHaveLength(64);
  });

  it("clamps limit into 1..20", () => {
    expect(clampSuggestLimit(null)).toBe(8);
    expect(clampSuggestLimit("0")).toBe(1);
    expect(clampSuggestLimit("99")).toBe(20);
    expect(clampSuggestLimit("abc")).toBe(8);
    expect(clampSuggestLimit("12")).toBe(12);
  });

  it("prefers CF-Connecting-IP for client identity", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.1, 203.0.113.10",
      "x-real-ip": "192.0.2.1",
    });
    expect(clientIpFromRequest(headers)).toBe("203.0.113.10");
  });
});
