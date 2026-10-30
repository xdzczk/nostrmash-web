import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

vi.mock("@/lib/discover/window-fallback", () => ({
  lastDiscoveryWindow: vi.fn(async () => "7d"),
  unsupportedDiscoveryWindowHref: (next: string) =>
    `/api/discovery-window/unsupported?next=${encodeURIComponent(next)}`,
}));

vi.mock("@/lib/api/endpoints", () => ({
  getDiscoveryHome: vi.fn(),
  getNetworkStats: vi.fn(),
  getRelayStats: vi.fn(),
  getRisingProfiles: vi.fn(),
  getStatsSeries: vi.fn(),
  normalizeSeriesPoints: vi.fn(() => []),
  getTrendingDomains: vi.fn(),
  getTrendingHashtags: vi.fn(),
  getTrendingNotes: vi.fn(),
  getTrendingProfiles: vi.fn(),
  getTrendingMedia: vi.fn(async () => ({ events: [] })),
}));

vi.mock("@/lib/api/profile-hydration", () => ({
  fetchProfilesByPubkey: vi.fn(async () => ({})),
}));

import {
  getDiscoveryHome,
  getNetworkStats,
  getRelayStats,
  getRisingProfiles,
  getStatsSeries,
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingMedia,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import { lastDiscoveryWindow } from "@/lib/discover/window-fallback";
import { attachPulseSeries, loadHomePageData } from "@/lib/home/load-home-page-data";

describe("attachPulseSeries", () => {
  const series = [
    { t: 1, v: 10 },
    { t: 2, v: 12 },
  ];
  const tiles = [
    { label: "active_authors_24h", value: 4000 },
    { label: "note_volume_24h", value: 41600 },
    { label: "network_relays_active_24h", value: 11 },
    { label: "event_volume_24h", value: 440000 },
  ];

  it("pairs each tile with its own series and drops tiles without a trend", () => {
    const result = attachPulseSeries(tiles, {
      noteVolume: series,
      activeAuthors: series,
      relayEvents: [
        { t: 1, v: 1 },
        { t: 2, v: 2 },
      ],
    });
    expect(result.map((stat) => stat.label)).toEqual([
      "active_authors_24h",
      "note_volume_24h",
      "event_volume_24h",
    ]);
    expect(result[2]?.series).toEqual([
      { t: 1, v: 1 },
      { t: 2, v: 2 },
    ]);
  });

  it("keeps every tile when no series are available", () => {
    const result = attachPulseSeries(tiles, { noteVolume: [], activeAuthors: [], relayEvents: [] });
    expect(result).toHaveLength(4);
    expect(result.every((stat) => !stat.series || stat.series.length === 0)).toBe(true);
  });

  it("never collapses the strip below two tiles", () => {
    const result = attachPulseSeries(tiles, {
      noteVolume: series,
      activeAuthors: [],
      relayEvents: [],
    });
    expect(result).toHaveLength(4);
  });
});

describe("loadHomePageData", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("starts media leaders without waiting for discovery", async () => {
    let releaseHome: (value: unknown) => void = () => undefined;
    vi.mocked(getDiscoveryHome).mockReturnValue(
      new Promise((resolve) => {
        releaseHome = resolve;
      }) as never
    );
    vi.mocked(getNetworkStats).mockResolvedValue({} as never);
    vi.mocked(getRelayStats).mockResolvedValue({} as never);
    vi.mocked(getStatsSeries).mockResolvedValue({ points: [] } as never);
    vi.mocked(getTrendingMedia).mockResolvedValue({ events: [] } as never);

    const pending = loadHomePageData({});
    try {
      await vi.waitFor(() => {
        expect(getTrendingMedia).toHaveBeenCalled();
      });
      expect(getDiscoveryHome).toHaveBeenCalled();
      const homeSettled = await Promise.race([pending.then(() => true), Promise.resolve(false)]);
      expect(homeSettled).toBe(false);
    } finally {
      releaseHome({
        notes: [{ id: "a".repeat(64), content: "hello" }],
        profiles: [{ pubkey: "b".repeat(64), display_name: "Ada" }],
        rising_profiles: [{ pubkey: "c".repeat(64) }],
        hashtags: [{ hashtag: "nostr" }],
        domains: [{ domain: "example.com" }],
      });
      await pending;
    }
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
    vi.mocked(getRisingProfiles).mockResolvedValue({ profiles: [] } as never);
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
      risingProfiles: false,
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
    vi.mocked(getRisingProfiles).mockResolvedValue({ profiles: [] } as never);
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
    vi.mocked(getRisingProfiles).mockResolvedValue({ profiles: [] } as never);
    vi.mocked(getTrendingHashtags).mockResolvedValue({ hashtags: [] } as never);
    vi.mocked(getTrendingDomains).mockResolvedValue({ domains: [] } as never);
    vi.mocked(getNetworkStats).mockResolvedValue({} as never);
    vi.mocked(getRelayStats).mockResolvedValue({} as never);
    vi.mocked(getStatsSeries).mockResolvedValue({ points: [] } as never);

    const data = await loadHomePageData({ window: "7d" });

    expect(data.window).toBe("7d");
    expect(data.discoveryWindowRedirect).toBeNull();
    expect(data.homeNotes[0]?.content).toBe("trend");
    expect(getDiscoveryHome).toHaveBeenCalledWith("shortTtl", { window: "7d" });
    expect(getRelayStats).toHaveBeenCalledWith("shortTtl", "7d");
    expect(getStatsSeries).toHaveBeenCalledWith("note_volume", "7d", "shortTtl");
    expect(getTrendingNotes).toHaveBeenCalledOnce();
    expect(getTrendingProfiles).toHaveBeenCalledOnce();
  });

  it("requests 30d discovery data and keeps relay stats on 24h", async () => {
    vi.mocked(getDiscoveryHome).mockResolvedValue({
      notes: [{ id: "a".repeat(64), content: "month" }],
      profiles: [{ pubkey: "b".repeat(64) }],
      hashtags: [{ hashtag: "nostr" }],
      domains: [{ domain: "example.com" }],
    } as never);
    vi.mocked(getNetworkStats).mockResolvedValue({} as never);
    vi.mocked(getRelayStats).mockResolvedValue({} as never);
    vi.mocked(getStatsSeries).mockResolvedValue({ points: [] } as never);

    const data = await loadHomePageData({ window: "30d" });

    expect(data.window).toBe("30d");
    expect(data.discoveryWindowRedirect).toBeNull();
    expect(data.homeNotes[0]?.content).toBe("month");
    expect(getDiscoveryHome).toHaveBeenCalledWith("shortTtl", { window: "30d" });
    expect(getRelayStats).toHaveBeenCalledWith("shortTtl", "24h");
    expect(getNetworkStats).toHaveBeenCalledWith("shortTtl");
    expect(getStatsSeries).toHaveBeenCalledWith("note_volume", "7d", "shortTtl");
    expect(getStatsSeries).toHaveBeenCalledWith("active_authors", "7d", "shortTtl");
    expect(getStatsSeries).toHaveBeenCalledWith("relay_events", "7d", "shortTtl");
    expect(getTrendingNotes).not.toHaveBeenCalled();
  });

  it("hides 30d and points at the previous range when discovery rejects it", async () => {
    vi.mocked(lastDiscoveryWindow).mockResolvedValue("7d");
    vi.mocked(getDiscoveryHome).mockRejectedValue(
      new ApiError({
        status: 400,
        message: "window must be one of: 24h, 7d",
        path: "/api/v1/discovery/home",
      })
    );
    vi.mocked(getNetworkStats).mockResolvedValue({} as never);
    vi.mocked(getRelayStats).mockResolvedValue({} as never);
    vi.mocked(getStatsSeries).mockResolvedValue({ points: [] } as never);

    const data = await loadHomePageData({ window: "30d" });

    expect(data.discoveryWindowRedirect).toBe(
      "/api/discovery-window/unsupported?next=%2F%3Fwindow%3D7d"
    );
    expect(getTrendingNotes).not.toHaveBeenCalled();
    expect(getRelayStats).toHaveBeenCalledWith("shortTtl", "24h");
  });

  it("degrades with an error message when upstream discovery fails", async () => {
    vi.mocked(getDiscoveryHome).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getNetworkStats).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getRelayStats).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getStatsSeries).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingNotes).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingProfiles).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getRisingProfiles).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingHashtags).mockRejectedValue(new Error("API 503: down"));
    vi.mocked(getTrendingDomains).mockRejectedValue(new Error("API 503: down"));

    const data = await loadHomePageData({});

    expect(data.homeNotes).toEqual([]);
    expect(data.errorMessage.length).toBeGreaterThan(0);
    expect(data.sectionFailures).toEqual({
      notes: true,
      profiles: true,
      risingProfiles: true,
      hashtags: true,
      domains: true,
    });
  });

  it("passes lang to discovery rankings and leaves relay stats unscoped", async () => {
    vi.mocked(getDiscoveryHome).mockResolvedValue({
      notes: [{ id: "d".repeat(64), content: "hallo" }],
      profiles: [{ pubkey: "e".repeat(64), display_name: "Ada" }],
      rising_profiles: [{ pubkey: "f".repeat(64) }],
      hashtags: [{ hashtag: "nostr" }],
      domains: [{ domain: "example.com" }],
      top_languages: { "24h": [{ language: "de", count: 12 }] },
    } as never);
    vi.mocked(getNetworkStats).mockResolvedValue({} as never);
    vi.mocked(getRelayStats).mockResolvedValue({} as never);
    vi.mocked(getStatsSeries).mockResolvedValue({ points: [] } as never);

    const data = await loadHomePageData({ lang: "de" });

    expect(data.language).toBe("de");
    expect(data.topLanguages).toEqual({ "24h": [{ language: "de", count: 12 }] });
    expect(getDiscoveryHome).toHaveBeenCalledWith("shortTtl", { window: "24h", lang: "de" });
    expect(getTrendingNotes).not.toHaveBeenCalled();
    expect(getRelayStats).toHaveBeenCalledWith("shortTtl", "24h");
    expect(getNetworkStats).toHaveBeenCalledWith("shortTtl");
    const relayArgs = vi.mocked(getRelayStats).mock.calls[0] ?? [];
    expect(relayArgs).toHaveLength(2);
  });
});
