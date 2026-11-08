import { describe, expect, it } from "vitest";

import { isOfflineRelayHost, propagationLine } from "@/lib/notes/propagation";

describe("propagationLine", () => {
  it("orders relays that have a timestamp and skips the rest", () => {
    expect(
      propagationLine([
        { host: "relay.other.example.com", seenAt: "2026-07-30T13:00:00.000Z" },
        { host: "relay.example.com", seenAt: "2026-07-30T11:00:00.000Z" },
        { host: "relay.untimed.example.com" },
      ])
    ).toBe("First on relay.example.com · relay.other.example.com +2h");
  });

  it("returns nothing when no relay has a timestamp", () => {
    expect(propagationLine([{ host: "relay.example.com" }])).toBeNull();
  });

  it("recognizes the shut-down relays", () => {
    expect(isOfflineRelayHost("relay.damus.io")).toBe(true);
    expect(isOfflineRelayHost("Relay.Mostr.Pub.")).toBe(true);
    expect(isOfflineRelayHost("relay.example.com")).toBe(false);
  });
});
