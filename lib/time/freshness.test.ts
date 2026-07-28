import { describe, expect, it } from "vitest";

import { formatUpdatedRelative, isFreshTimestamp, parseTimestamp } from "@/lib/time/freshness";

describe("freshness helpers", () => {
  it("parses unix seconds and ISO strings", () => {
    expect(parseTimestamp(1_722_168_000)?.toISOString()).toBe("2024-07-28T12:00:00.000Z");
    expect(parseTimestamp("2026-07-28T12:00:00.000Z")?.toISOString()).toBe(
      "2026-07-28T12:00:00.000Z"
    );
    expect(parseTimestamp(null)).toBeNull();
  });

  it("formats relative updated labels without inventing fallbacks", () => {
    const nowMs = Date.parse("2026-07-28T12:10:00.000Z");
    expect(formatUpdatedRelative("2026-07-28T12:00:00.000Z", nowMs)).toBe("Updated 10m ago");
    expect(formatUpdatedRelative(undefined, nowMs)).toBeNull();
  });

  it("detects freshness against the 30-minute threshold", () => {
    const nowMs = Date.parse("2026-07-28T12:20:00.000Z");
    expect(isFreshTimestamp("2026-07-28T12:00:00.000Z", nowMs)).toBe(true);
    expect(isFreshTimestamp("2026-07-28T11:40:00.000Z", nowMs)).toBe(false);
  });
});
