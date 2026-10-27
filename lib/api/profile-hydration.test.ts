import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/endpoints", () => ({
  getProfilesBatch: vi.fn(),
  getProfile: vi.fn(),
  getEventsBatch: vi.fn(),
}));

import { getProfilesBatch } from "@/lib/api/endpoints";
import { hydrateProfiles, mergeHydratedProfile } from "@/lib/api/profile-hydration";
import type { Profile } from "@/lib/types/api";

const mockedGetProfilesBatch = vi.mocked(getProfilesBatch);

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

describe("hydrateProfiles", () => {
  const pubkey = "ab".repeat(32);

  beforeEach(() => {
    mockedGetProfilesBatch.mockReset();
  });

  it("loads a picture when search already returned a name", async () => {
    mockedGetProfilesBatch.mockResolvedValue([
      {
        pubkey,
        display_name: "Derek",
        picture: "https://cdn.example/derek.jpg",
      },
    ]);

    const [profile] = await hydrateProfiles([
      {
        pubkey,
        display_name: "Derek Ross",
        nip05: "derek@example.com",
        follower_count: 12,
      },
    ]);

    expect(mockedGetProfilesBatch).toHaveBeenCalledWith([pubkey], "shortTtl");
    expect(profile?.picture).toBe("https://cdn.example/derek.jpg");
    expect(profile?.follower_count).toBe(12);
  });

  it("skips the profile service when a picture is already present", async () => {
    const profiles = await hydrateProfiles([
      {
        pubkey,
        display_name: "Ada",
        picture: "https://cdn.example/ada.jpg",
      },
    ]);

    expect(mockedGetProfilesBatch).not.toHaveBeenCalled();
    expect(profiles[0]?.picture).toBe("https://cdn.example/ada.jpg");
  });
});
