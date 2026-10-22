import { describe, expect, it } from "vitest";

import { mergeHydratedProfile } from "@/lib/api/profile-hydration";
import type { Profile } from "@/lib/types/api";

describe("mergeHydratedProfile", () => {
  it("keeps the discovery ranking when the profile service has none", () => {
    const ranked = {
      pubkey: "aa",
      display_name: "White Noise",
      ranking: {
        rank: 1,
        score: 33,
        source_breadth: undefined,
        reasons: [
          {
            code: "engagement_quality",
            evidence: [{ metric: "engagement_per_post", value: 33, unit: "interactions per note" }],
          },
        ],
      },
    } satisfies Profile;
    const hydrated = {
      pubkey: "aa",
      display_name: "White Noise",
      picture: "https://cdn.example/a.png",
      ranking: undefined,
    } satisfies Profile;

    expect(mergeHydratedProfile(ranked, hydrated).ranking?.reasons?.[0]?.code).toBe(
      "engagement_quality"
    );
    expect(mergeHydratedProfile(ranked, hydrated).picture).toBe("https://cdn.example/a.png");
  });
});
