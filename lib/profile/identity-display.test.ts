import { describe, expect, it } from "vitest";

import { nip05Hint, visibleIdentityFields } from "@/lib/profile/identity-display";
import {
  clientLabel,
  formatBasisPointsAsPercent,
  formatUnitShare,
  summedHistogram,
} from "@/lib/stats/ecosystem-display";

describe("nip05Hint", () => {
  it("shows a verified badge only from the boolean", () => {
    expect(nip05Hint({ nip05_verified: true, nip05_status: "mismatch" })).toBe("verified");
    expect(nip05Hint({ nip05_verified: false, nip05_status: "verified" })).toBeNull();
  });

  it("stays quiet for pending and blank status", () => {
    expect(nip05Hint({ nip05_status: "" })).toBeNull();
    expect(nip05Hint({ nip05_status: "pending" })).toBeNull();
    expect(nip05Hint({})).toBeNull();
  });

  it("uses a quiet unverified hint for mismatch, not_found, and invalid", () => {
    expect(nip05Hint({ nip05_status: "mismatch" })).toBe("unverified");
    expect(nip05Hint({ nip05_status: "not_found" })).toBe("unverified");
    expect(nip05Hint({ nip05_status: "invalid" })).toBe("unverified");
  });

  it("names unreachable and blocked statuses", () => {
    expect(nip05Hint({ nip05_status: "unreachable" })).toBe("unreachable");
    expect(nip05Hint({ nip05_status: "blocked" })).toBe("blocked");
  });
});

describe("visibleIdentityFields", () => {
  it("hides a profile with no identity fields", () => {
    expect(visibleIdentityFields({})).toEqual([]);
  });

  it("shows completeness, domains, and nutzap acceptance", () => {
    expect(
      visibleIdentityFields({
        nip05: "ada@example.com",
        nip05_verified: true,
        lud16_domain: "getalby.com",
        website_domain: "example.com",
        completeness_score: 0,
        accepts_nutzaps: false,
      })
    ).toEqual([
      { label: "NIP-05", value: "ada@example.com", hint: "verified" },
      { label: "Lightning address domain", value: "getalby.com" },
      { label: "Website domain", value: "example.com" },
      { label: "Completeness", value: "0 of 8" },
      { label: "Accepts nutzaps", value: "No" },
    ]);
  });
});

describe("ecosystem display", () => {
  it("labels the unattributed client and formats shares", () => {
    expect(clientLabel("(none)")).toBe("Unattributed");
    expect(clientLabel("damus")).toBe("damus");
    expect(formatUnitShare(0.0125)).toBe("1.25%");
    expect(formatUnitShare(0.5)).toBe("50%");
    expect(formatBasisPointsAsPercent(150)).toBe("1.5%");
  });

  it("sums only histogram keys that are present", () => {
    expect(
      summedHistogram([
        { day: "2026-11-04", histogram: { lt21: 1, "21_100": 2 } },
        { day: "2026-11-05", histogram: { lt21: 3 } },
      ])
    ).toEqual([
      { key: "lt21", count: 4 },
      { key: "21_100", count: 2 },
    ]);
  });
});
