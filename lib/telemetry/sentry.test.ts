import { describe, expect, it } from "vitest";

import { isExpectedApiStatus, normalizeApiPath } from "@/lib/telemetry/sentry";

describe("sentry api helpers", () => {
  it("treats common client/upstream policy statuses as expected", () => {
    expect(isExpectedApiStatus(404)).toBe(true);
    expect(isExpectedApiStatus(429)).toBe(true);
    expect(isExpectedApiStatus(400)).toBe(true);
    expect(isExpectedApiStatus(500)).toBe(false);
    expect(isExpectedApiStatus(408)).toBe(false);
    expect(isExpectedApiStatus(undefined)).toBe(false);
  });

  it("normalizes dynamic API path segments for dedupe keys", () => {
    const pubkey = "a".repeat(64);
    expect(normalizeApiPath(`/api/v1/discovery/profiles/${pubkey}/related`)).toBe(
      "/api/v1/discovery/profiles/:hex/related"
    );

    expect(normalizeApiPath("/api/v1/discovery/hashtags/nostr")).toBe(
      "/api/v1/discovery/hashtags/:tag"
    );

    expect(
      normalizeApiPath(
        "/api/v1/notes/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/summary"
      )
    ).toBe("/api/v1/notes/:hex/summary");
  });
});
