import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...(actual as object),
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

vi.mock("@/lib/api/endpoints", () => ({
  getProfileSummary: vi.fn(),
  getProfile: vi.fn(),
  getAuthorEvents: vi.fn(),
  getAuthorReplies: vi.fn(),
  getAuthorReactions: vi.fn(),
  getAuthorZaps: vi.fn(),
  getUserLongForm: vi.fn(),
  getUserBookmarks: vi.fn(),
  getUserHighlights: vi.fn(),
  getUserMuteList: vi.fn(),
  getUserMutedBy: vi.fn(),
  getRelatedProfiles: vi.fn(),
  getRisingProfiles: vi.fn(),
}));

vi.mock("@/lib/api/profile-hydration", () => ({
  extractEventAuthorPubkeys: vi.fn(() => []),
  fetchEventsById: vi.fn(async () => ({})),
  fetchProfilesByPubkey: vi.fn(async () => ({})),
}));

import {
  getAuthorEvents,
  getAuthorReactions,
  getAuthorReplies,
  getAuthorZaps,
  getProfile,
  getProfileSummary,
  getRelatedProfiles,
  getRisingProfiles,
  getUserBookmarks,
  getUserHighlights,
  getUserLongForm,
  getUserMuteList,
  getUserMutedBy,
} from "@/lib/api/endpoints";
import { loadProfilePageData } from "@/lib/profile/load-profile-page-data";

const mocked = {
  getProfileSummary: vi.mocked(getProfileSummary),
  getProfile: vi.mocked(getProfile),
  getAuthorEvents: vi.mocked(getAuthorEvents),
  getAuthorReplies: vi.mocked(getAuthorReplies),
  getAuthorReactions: vi.mocked(getAuthorReactions),
  getAuthorZaps: vi.mocked(getAuthorZaps),
  getUserLongForm: vi.mocked(getUserLongForm),
  getUserBookmarks: vi.mocked(getUserBookmarks),
  getUserHighlights: vi.mocked(getUserHighlights),
  getUserMuteList: vi.mocked(getUserMuteList),
  getUserMutedBy: vi.mocked(getUserMutedBy),
  getRelatedProfiles: vi.mocked(getRelatedProfiles),
  getRisingProfiles: vi.mocked(getRisingProfiles),
};

describe("loadProfilePageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getAuthorEvents.mockResolvedValue({ events: [] });
    mocked.getAuthorReplies.mockResolvedValue({ replies: [] });
    mocked.getAuthorReactions.mockResolvedValue({ reactions: [] });
    mocked.getAuthorZaps.mockResolvedValue({ zaps: [] });
    mocked.getUserLongForm.mockResolvedValue({ articles: [] });
    mocked.getUserBookmarks.mockResolvedValue({ events: [] });
    mocked.getUserHighlights.mockResolvedValue({ highlights: [] });
    mocked.getUserMuteList.mockResolvedValue({ profiles: [] });
    mocked.getUserMutedBy.mockResolvedValue({ profiles: [] });
    mocked.getRelatedProfiles.mockResolvedValue({ related_profiles: [] });
    mocked.getRisingProfiles.mockResolvedValue({ profiles: [] });
  });

  it("loads summary notes on the default activity tab without enrichment when identity exists", async () => {
    const pubkey = "e".repeat(64);
    mocked.getProfileSummary.mockResolvedValue({
      pubkey,
      profile: {
        pubkey,
        display_name: "Ada",
        picture: "https://example.com/a.png",
      },
      related_discovery: {
        related_profiles: [{ pubkey: "f".repeat(64), display_name: "Related" }],
        rising_profiles: [{ pubkey: "0".repeat(64), display_name: "Rising" }],
      },
      recent_note_previews: [
        {
          id: "1".repeat(64),
          pubkey,
          kind: 1,
          content: "note one",
          created_at: 1_700_000_000,
        },
      ],
    });

    const data = await loadProfilePageData(pubkey, {});

    expect(data.errorMessage).toBe("");
    expect(data.profile?.display_name).toBe("Ada");
    expect(data.notes).toHaveLength(1);
    expect(data.relatedProfiles).toHaveLength(1);
    expect(data.risingProfiles).toHaveLength(1);
    expect(mocked.getProfile).not.toHaveBeenCalled();
    expect(mocked.getAuthorEvents).toHaveBeenCalled();
  });

  it("captures summary failures as a user-facing error message", async () => {
    mocked.getProfileSummary.mockRejectedValue(new Error("API 500: summary failed"));

    const data = await loadProfilePageData("npub1example", {});

    expect(data.profile).toBeNull();
    expect(data.errorMessage).toMatch(/Failed to load profile summary|summary failed/i);
  });
});
