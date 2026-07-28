import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/http", () => ({
  fetchApiJson: vi.fn(),
}));

vi.mock("@/lib/api/endpoints/notes", () => ({
  getEvent: vi.fn(),
}));

vi.mock("@/lib/api/endpoints/profiles", () => ({
  getProfile: vi.fn(),
}));

import { fetchApiJson } from "@/lib/api/http";
import { getEvent } from "@/lib/api/endpoints/notes";
import { getProfile } from "@/lib/api/endpoints/profiles";
import { getSearch } from "@/lib/api/endpoints/search";

const mockedFetch = vi.mocked(fetchApiJson);
const mockedGetEvent = vi.mocked(getEvent);
const mockedGetProfile = vi.mocked(getProfile);

const noteId = "a".repeat(64);
const pubkey = "b".repeat(64);

describe("getSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notes-tab results and falls back to direct event lookup", async () => {
    mockedFetch.mockResolvedValueOnce({
      notes: [],
      offset: 0,
      total: 0,
    });
    mockedGetEvent.mockResolvedValueOnce({
      event: {
        id: noteId,
        pubkey,
        kind: 1,
        created_at: 1_700_000_000,
        content: "direct hit",
      },
    });

    const result = await getSearch({ q: noteId, tab: "notes", limit: 20, offset: 0 });

    expect(result.notes).toHaveLength(1);
    expect(result.notes?.[0]?.id).toBe(noteId);
    expect(result.profiles).toEqual([]);
    expect(mockedGetEvent).toHaveBeenCalledWith(noteId, "requestTime");
  });

  it("returns profiles-tab results and falls back to direct profile lookup", async () => {
    mockedFetch.mockResolvedValueOnce({
      profiles: [],
      offset: 0,
      total: 0,
    });
    mockedGetProfile.mockResolvedValueOnce({
      pubkey,
      display_name: "Ada",
    });

    const result = await getSearch({ q: pubkey, tab: "profiles", limit: 20, offset: 0 });

    expect(result.profiles).toHaveLength(1);
    expect(result.profiles?.[0]?.display_name).toBe("Ada");
    expect(result.notes).toEqual([]);
    expect(mockedGetProfile).toHaveBeenCalledWith(pubkey, "requestTime");
  });

  it("merges all-tab surfaces and keeps partial failures as surface errors", async () => {
    // Bundle call (include=suggest) — no suggest payload, so code falls back to legacy fan-out.
    mockedFetch
      .mockResolvedValueOnce({
        notes: [{ id: noteId, pubkey, kind: 1, content: "from search", created_at: 1 }],
        profiles: [],
        total: 1,
      })
      .mockResolvedValueOnce({
        notes: [{ id: noteId, pubkey, kind: 1, content: "from search", created_at: 1 }],
        profiles: [],
        total: 1,
      })
      .mockRejectedValueOnce(new Error("notes surface down"))
      .mockResolvedValueOnce({
        profiles: [{ pubkey, display_name: "Ada" }],
      })
      .mockResolvedValueOnce({
        profiles: [{ pubkey: "c".repeat(64), display_name: "Suggested" }],
        hashtags: [{ hashtag: "bitcoin" }],
        relays: ["wss://relay.example"],
      });

    const result = await getSearch({ q: "bitcoin", limit: 20 });

    expect(result.notes).toHaveLength(1);
    expect(result.profiles?.some((profile) => profile.display_name === "Ada")).toBe(true);
    expect(result.hashtags?.[0]?.hashtag).toBe("bitcoin");
    expect(result.relays).toContain("wss://relay.example");
    expect(result.surface_errors?.notes).toMatch(/notes surface down/i);
  });

  it("uses the search bundle when include=suggest data is present", async () => {
    mockedFetch.mockResolvedValueOnce({
      notes: [{ id: noteId, pubkey, kind: 1, content: "bundled", created_at: 1 }],
      profiles: [{ pubkey, display_name: "Ada" }],
      suggested_profiles: [{ pubkey: "c".repeat(64), display_name: "Suggested" }],
      suggested_hashtags: [{ hashtag: "bitcoin" }],
      include: ["suggest"],
      section_totals: { notes: 1, profiles: 1 },
      total: 1,
    });

    const result = await getSearch({ q: "bitcoin", limit: 20 });

    expect(result.notes).toHaveLength(1);
    expect(result.profiles?.some((profile) => profile.display_name === "Ada")).toBe(true);
    expect(result.hashtags?.[0]?.hashtag).toBe("bitcoin");
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("throws when every all-tab surface fails", async () => {
    mockedFetch.mockRejectedValue(new Error("upstream unavailable"));

    await expect(getSearch({ q: "bitcoin", limit: 10 })).rejects.toThrow(
      /All search surfaces failed|upstream unavailable/i
    );
  });
});
