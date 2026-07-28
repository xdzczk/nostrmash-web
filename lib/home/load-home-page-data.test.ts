import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/endpoints", () => ({
  getDiscoveryHome: vi.fn(),
  getNetworkStats: vi.fn(),
  getRelayStats: vi.fn(),
  getTrendingDomains: vi.fn(),
  getTrendingHashtags: vi.fn(),
  getTrendingNotes: vi.fn(),
  getTrendingProfiles: vi.fn(),
}));

vi.mock("@/lib/api/profile-hydration", () => ({
  fetchProfilesByPubkey: vi.fn(async () => ({})),
}));

import {
  getDiscoveryHome,
  getNetworkStats,
  getRelayStats,
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import { loadHomePageData } from "@/lib/home/load-home-page-data";

describe("loadHomePageData", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("loads discovery + network stats in a single parallel stage for 24h", async () => {
    vi.mocked(getDiscoveryHome).mockResolvedValue({
      notes: [{ id: "a".repeat(64), content: "hello" }],
      profiles: [{ pubkey: "b".repeat(64), display_name: "Ada" }],
      hashtags: [{ hashtag: "bitcoin" }],
      domains: [{ domain: "example.com" }],
      stats: { events_ingested: 10 },
    } as never);
    vi.mocked(getNetworkStats).mockResolvedValue({ events_ingested: 12 } as never);
    vi.mocked(getRelayStats).mockResolvedValue({ relays: [] } as never);

    const data = await loadHomePageData({});

    expect(data.homeNotes).toHaveLength(1);
    expect(data.hydratedHomeProfiles[0]?.display_name).toBe("Ada");
    expect(data.homeHashtags[0]?.hashtag).toBe("bitcoin");
    expect(getTrendingNotes).not.toHaveBeenCalled();
    expect(getDiscoveryHome).toHaveBeenCalledOnce();
    expect(getNetworkStats).toHaveBeenCalledOnce();
  });

  it("fetches windowed trends in parallel for non-24h windows", async () => {
    vi.mocked(getDiscoveryHome).mockResolvedValue({
      notes: [],
      profiles: [],
      hashtags: [],
      domains: [],
    } as never);
    vi.mocked(getTrendingNotes).mockResolvedValue({
      notes: [{ id: "c".repeat(64), content: "trend" }],
    } as never);
    vi.mocked(getTrendingProfiles).mockResolvedValue({ profiles: [] } as never);
    vi.mocked(getTrendingHashtags).mockResolvedValue({ hashtags: [] } as never);
    vi.mocked(getTrendingDomains).mockResolvedValue({ domains: [] } as never);
    vi.mocked(getNetworkStats).mockResolvedValue({} as never);
    vi.mocked(getRelayStats).mockResolvedValue({} as never);

    const data = await loadHomePageData({ window: "7d" });

    expect(data.window).toBe("7d");
    expect(data.homeNotes[0]?.content).toBe("trend");
    expect(getTrendingNotes).toHaveBeenCalledOnce();
    expect(getTrendingProfiles).toHaveBeenCalledOnce();
  });

  it("degrades with an error message when upstream discovery fails", async () => {
    vi.mocked(getDiscoveryHome).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getNetworkStats).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getRelayStats).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingNotes).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingProfiles).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingHashtags).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingDomains).mockRejectedValue(new Error("API 503: down"));

    const data = await loadHomePageData({});

    expect(data.homeNotes).toEqual([]);
    expect(data.errorMessage.length).toBeGreaterThan(0);
  });
});
