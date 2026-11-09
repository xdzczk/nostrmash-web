import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/endpoints", () => ({
  getProfilesBatch: vi.fn(),
  getProfile: vi.fn(),
  getEventsBatch: vi.fn(),
}));

import { getProfile, getProfilesBatch } from "@/lib/api/endpoints";
import {
  fetchProfilesByPubkey,
  hydrateProfiles,
  mergeHydratedProfile,
  restoreRankingMetrics,
} from "@/lib/api/profile-hydration";
import type { Profile } from "@/lib/types/api";

const mockedGetProfilesBatch = vi.mocked(getProfilesBatch);
const mockedGetProfile = vi.mocked(getProfile);

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

describe("restoreRankingMetrics", () => {
  it("puts the ranking numbers back after identity hydration", () => {
    const ranked = {
      pubkey: "aa",
      score: 100_000,
      follower_count: 12,
      capped_sats: 100_000,
      sats_received: 500_000,
      supporter_count: 3,
      recent_zap_volume_msats: 500_000_000,
      ranking: {
        rank: 1,
        score: 100_000,
        reasons: [{ code: "supporter_sats", evidence: [] }],
      },
    } satisfies Profile;
    const hydrated = {
      pubkey: "aa",
      display_name: "Ada",
      picture: "https://cdn.example/a.png",
      score: 4,
      follower_count: 900,
      capped_sats: 1,
      sats_received: 2,
      supporter_count: 1,
      recent_zap_volume_msats: 9,
    } satisfies Profile;

    const restored = restoreRankingMetrics(ranked, hydrated);
    expect(restored.display_name).toBe("Ada");
    expect(restored.picture).toBe("https://cdn.example/a.png");
    expect(restored.score).toBe(100_000);
    expect(restored.follower_count).toBe(12);
    expect(restored.capped_sats).toBe(100_000);
    expect(restored.sats_received).toBe(500_000);
    expect(restored.supporter_count).toBe(3);
    expect(restored.recent_zap_volume_msats).toBe(500_000_000);
    expect(restored.ranking?.reasons?.[0]?.code).toBe("supporter_sats");
  });
});

describe("fetchProfilesByPubkey", () => {
  const pubkey = "cd".repeat(32);

  beforeEach(() => {
    mockedGetProfilesBatch.mockReset();
    mockedGetProfile.mockReset();
  });

  it("loads a picture when the batch row only has a name", async () => {
    mockedGetProfilesBatch.mockResolvedValue([{ pubkey, display_name: "Derek" }]);
    mockedGetProfile.mockResolvedValue({
      pubkey,
      display_name: "Derek",
      picture: "https://cdn.example/derek.jpg",
    });

    const profiles = await fetchProfilesByPubkey([pubkey]);

    expect(mockedGetProfile).toHaveBeenCalledWith(pubkey, "shortTtl");
    expect(profiles[pubkey]?.picture).toBe("https://cdn.example/derek.jpg");
    expect(profiles[pubkey]?.display_name).toBe("Derek");
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
