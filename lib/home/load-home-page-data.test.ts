import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/endpoints", () => ({
  getDiscoveryHome: vi.fn(),
  getNetworkStats: vi.fn(),
  getRelayStats: vi.fn(),
  getStatsSeries: vi.fn(),
  normalizeSeriesPoints: vi.fn(() => []),
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
  getStatsSeries,
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
      computed_at: "2026-08-02T08:53:16.323406Z",
    } as never);
    vi.mocked(getNetworkStats).mockResolvedValue({ events_ingested: 12 } as never);
    vi.mocked(getRelayStats).mockResolvedValue({ relays: [] } as never);
    vi.mocked(getStatsSeries).mockResolvedValue({
      points: [],
      // Hourly chart history — must not win over discovery/home freshness.
      computed_at: "2026-08-02T08:04:20.688461Z",
    } as never);

    const data = await loadHomePageData({});

    expect(data.homeNotes).toHaveLength(1);
    expect(data.hydratedHomeProfiles[0]?.display_name).toBe("Ada");
    expect(data.homeHashtags[0]?.hashtag).toBe("bitcoin");
    expect(data.computedAt).toBe("2026-08-02T08:53:16.323406Z");
    expect(data.sectionFailures).toEqual({
      notes: false,
      profiles: false,
      hashtags: false,
      domains: false,
    });
    expect(getTrendingNotes).not.toHaveBeenCalled();
    expect(getDiscoveryHome).toHaveBeenCalledOnce();
    expect(getNetworkStats).toHaveBeenCalledOnce();
  });

  it("falls back to network stats computed_at when discovery/home omits it", async () => {
    vi.mocked(getDiscoveryHome).mockResolvedValue({
      notes: [],
      profiles: [],
      hashtags: [],
      domains: [],
    } as never);
    vi.mocked(getTrendingNotes).mockResolvedValue({ notes: [] } as never);
    vi.mocked(getTrendingProfiles).mockResolvedValue({ profiles: [] } as never);
    vi.mocked(getTrendingHashtags).mockResolvedValue({ hashtags: [] } as never);
    vi.mocked(getTrendingDomains).mockResolvedValue({ domains: [] } as never);
    vi.mocked(getNetworkStats).mockResolvedValue({
      computed_at: "2026-08-02T08:50:00Z",
    } as never);
    vi.mocked(getRelayStats).mockResolvedValue({} as never);
    vi.mocked(getStatsSeries).mockResolvedValue({
      points: [],
      computed_at: "2026-08-02T08:04:00Z",
    } as never);

    const data = await loadHomePageData({});

    expect(data.computedAt).toBe("2026-08-02T08:50:00Z");
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
    vi.mocked(getStatsSeries).mockResolvedValue({ points: [] } as never);

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
    vi.mocked(getStatsSeries).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingNotes).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingProfiles).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingHashtags).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingDomains).mockRejectedValue(new Error("API 503: down"));

    const data = await loadHomePageData({});

    expect(data.homeNotes).toEqual([]);
    expect(data.errorMessage.length).toBeGreaterThan(0);
    expect(data.sectionFailures).toEqual({
      notes: true,
      profiles: true,
      hashtags: true,
      domains: true,
    });
  });
});
