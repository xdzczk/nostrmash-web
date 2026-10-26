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
  getUserBookmarks,
  getUserHighlights,
  getUserLongForm,
  getUserMuteList,
  getUserMutedBy,
} from "@/lib/api/endpoints";
import { loadProfileActivityData, loadProfilePageData } from "@/lib/profile/load-profile-page-data";

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
    expect(mocked.getProfile).not.toHaveBeenCalled();
    // kind=1 keeps reposts/reactions/long-form from consuming the notes budget.
    expect(mocked.getAuthorEvents).toHaveBeenCalledWith(
      expect.any(String),
      "shortTtl",
      expect.objectContaining({ kind: 1 })
    );
  });

  it("loads only the requested tab when fetching another activity page", async () => {
    const pubkey = "a".repeat(64);
    mocked.getAuthorReplies.mockResolvedValue({
      replies: [{ id: "1".repeat(64), pubkey, kind: 1, content: "a reply" }],
      next_cursor: "cursor-3",
    });

    const data = await loadProfileActivityData(
      {
        lookupKey: pubkey,
        profile: { pubkey },
        profileRoute: `/profiles/${pubkey}`,
        summaryRecord: null,
      },
      { activity: "replies", replies_cursor: "cursor-2" },
      { focused: true }
    );

    expect(mocked.getAuthorEvents).not.toHaveBeenCalled();
    expect(mocked.getAuthorReactions).not.toHaveBeenCalled();
    expect(mocked.getAuthorReplies).toHaveBeenCalledWith(pubkey, "shortTtl", {
      cursor: "cursor-2",
    });
    expect(data.activityTab).toBe("replies");
    expect(data.replies).toHaveLength(1);
    expect(data.activeNextCursor).toBe("cursor-3");
  });

  it("captures summary failures as a user-facing error message", async () => {
    mocked.getProfileSummary.mockRejectedValue(new Error("API 500: summary failed"));

    const data = await loadProfilePageData("npub1example", {});

    expect(data.profile).toBeNull();
    expect(data.notFound).toBe(false);
    expect(data.errorMessage).toMatch(/Failed to load profile summary|summary failed/i);
  });

  it("flags notFound when the summary 404s and enrichment finds nothing", async () => {
    mocked.getProfileSummary.mockRejectedValue(new Error("API 404: not found"));
    mocked.getProfile.mockRejectedValue(new Error("API 404: not found"));

    const data = await loadProfilePageData("a".repeat(64), {});

    expect(data.notFound).toBe(true);
    expect(data.profile).toBeNull();
    // A 404 is a verdict, not a failure: no error banner copy.
    expect(data.errorMessage).toBe("");
  });

  it("does not flag notFound when enrichment still knows the profile", async () => {
    const pubkey = "b".repeat(64);
    mocked.getProfileSummary.mockRejectedValue(new Error("API 404: not found"));
    mocked.getProfile.mockResolvedValue({ pubkey, name: "ghost" });

    const data = await loadProfilePageData(pubkey, {});

    expect(data.notFound).toBe(false);
    expect(data.profile?.name).toBe("ghost");
    expect(data.errorMessage).toMatch(/summary is not available yet/i);
  });

  describe("related profiles source", () => {
    const pubkey = "c".repeat(64);

    beforeEach(() => {
      mocked.getProfileSummary.mockResolvedValue({
        pubkey,
        profile: { pubkey, display_name: "Subject" },
        related_discovery: { related_profiles: [] },
      });
    });

    it("reports the summary as the source and keeps adjacency reasons", async () => {
      mocked.getProfileSummary.mockResolvedValue({
        pubkey,
        profile: { pubkey, display_name: "Subject" },
        related_discovery: {
          related_profiles: [
            {
              pubkey: "d".repeat(64),
              display_name: "Neighbor",
              reasons: ["interaction_adjacency"],
              interaction_adjacency: 13,
            },
          ],
        },
      });

      const data = await loadProfilePageData(pubkey, {});

      expect(data.relatedSource).toBe("summary");
      expect(data.relatedDegradedReason).toBeUndefined();
      expect(data.relatedProfiles[0]).toMatchObject({ interaction_adjacency: 13 });
      expect(mocked.getRelatedProfiles).not.toHaveBeenCalled();
    });

    it("labels a degraded related payload as a trending fallback", async () => {
      mocked.getRelatedProfiles.mockResolvedValue({
        related_profiles: [{ pubkey: "e".repeat(64), display_name: "Trendy" }],
        degraded: true,
        degraded_reason: "related_profiles_unavailable",
      });

      const data = await loadProfilePageData(pubkey, {});

      expect(data.relatedSource).toBe("trending-fallback");
      expect(data.relatedDegradedReason).toBe("related_profiles_unavailable");
      expect(data.relatedProfiles).toHaveLength(1);
    });

    it("uses the related endpoint when it is healthy and drops the subject itself", async () => {
      mocked.getRelatedProfiles.mockResolvedValue({
        related_profiles: [
          { pubkey, display_name: "Subject (self)" },
          { pubkey: "f".repeat(64), display_name: "Other" },
        ],
      });

      const data = await loadProfilePageData(pubkey, {});

      expect(data.relatedSource).toBe("related");
      expect(data.relatedProfiles.map((entry) => entry.pubkey)).toEqual(["f".repeat(64)]);
    });
  });
});
