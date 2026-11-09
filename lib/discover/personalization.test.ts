import { describe, expect, it } from "vitest";

import {
  personalizationNotice,
  readPersonalization,
  viewerCohortDegraded,
} from "@/lib/discover/personalization";

const personalization = {
  viewer: "ab".repeat(32),
  source: "personalized" as const,
  follow_count: 12,
  follows_truncated: false,
  cohort_weight: 0.85,
};

describe("personalizationNotice", () => {
  it("describes a personalized list and a truncated follow set", () => {
    expect(personalizationNotice(personalization)).toBe(
      "Ranked from the 12 accounts this key follows."
    );
    expect(personalizationNotice(personalization, { scope: "home" })).toBe(
      "Notes, people, and links are ranked from the 12 accounts this key follows."
    );
    expect(
      personalizationNotice({ ...personalization, follow_count: 1, follows_truncated: true })
    ).toBe("Ranked from the 1 account this key follows. Only the most trusted follows were used.");
  });

  it("says a global fallback is the global list", () => {
    expect(
      personalizationNotice({ ...personalization, source: "global_fallback", follow_count: 0 })
    ).toBe("This key follows nobody indexed here, so this list is the global one.");
  });

  it("stays silent when the follow lookup failed", () => {
    expect(personalizationNotice(personalization, { degraded: true })).toBeNull();
    expect(personalizationNotice(undefined)).toBeNull();
    expect(
      viewerCohortDegraded({
        personalization,
        degraded_reasons: ["notes", "viewer_cohort"],
      })
    ).toBe(true);
    expect(viewerCohortDegraded({ personalization, degraded_reasons: ["notes"] })).toBe(false);
  });
});

describe("readPersonalization", () => {
  it("reads a nested object and ignores a missing viewer", () => {
    expect(readPersonalization({ personalization })).toEqual(personalization);
    expect(readPersonalization(personalization)).toEqual(personalization);
    expect(readPersonalization({ personalization: { source: "personalized" } })).toBeUndefined();
    expect(readPersonalization({ degraded_reasons: ["viewer_cohort"] })).toBeUndefined();
  });
});
