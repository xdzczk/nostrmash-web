import { describe, expect, it } from "vitest";

import { concentrationTitle, strikingConcentration } from "@/lib/relays/concentration";

describe("concentrationTitle", () => {
  it("states the share for the selected window", () => {
    expect(concentrationTitle(3, 75, "24h")).toBe(
      "Three relays carried 75% of what we indexed in the last day."
    );
    expect(concentrationTitle(3, 76.2, "7d")).toBe(
      "Three relays carried 76% of what we indexed in the last 7 days."
    );
    expect(concentrationTitle(3, 80, "30d")).toBe(
      "Three relays carried 80% of what we indexed in the last 30 days."
    );
  });

  it("uses a singular relay and digits past ten", () => {
    expect(concentrationTitle(1, 40, "24h")).toBe(
      "One relay carried 40% of what we indexed in the last day."
    );
    expect(concentrationTitle(12, 90, "24h")).toBe(
      "12 relays carried 90% of what we indexed in the last day."
    );
  });

  it("falls back when there is nothing to rank", () => {
    expect(concentrationTitle(0, 0, "24h")).toBe("The network behind the conversation.");
  });
});

describe("strikingConcentration", () => {
  it("states the share when a few relays carry most of the index", () => {
    expect(strikingConcentration([448, 417, 49, 24], "24h")).toBe(
      "Three relays carried 97% of what we indexed in the last day."
    );
  });

  it("stays quiet when the share is mild or the ranking is too short", () => {
    expect(strikingConcentration([15, 14, 13, 12, 11, 10, 9, 8, 8], "24h")).toBeNull();
    expect(strikingConcentration([90], "24h")).toBeNull();
  });
});
