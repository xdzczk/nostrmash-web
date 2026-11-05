import { afterEach, describe, expect, it, vi } from "vitest";

import {
  normalizeAccountStats,
  normalizeAuthorAnalyticsSummary,
  normalizeAuthorZapAnalytics,
  normalizeClientStats,
  normalizeIdentityStats,
  normalizeProfileIdentity,
  normalizeReactionBreakdown,
  normalizeRelayOverlap,
  normalizeRelayPropagation,
  normalizeZapStats,
} from "@/lib/api/normalize/ecosystem";
import { normalizeEventCountsResponse } from "@/lib/api/normalize/notes";
import { STATS_SERIES_METRICS } from "@/lib/stats/series-metrics";

describe("ecosystem normalizers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps client rows, flags, and the unattributed client", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const normalized = normalizeClientStats({
      consistency: "eventual",
      window: "7d",
      clients: [
        { client: "damus", event_count: 10, unique_authors: 4 },
        { client: "(none)", event_count: 2, unique_authors: 0 },
        { client: "", event_count: 9 },
        { event_count: 3 },
      ],
      content_flags: {
        events: 12,
        bridged_share: 0.25,
        content_warning_share: 0,
        pow_share: 0.5,
      },
    });

    expect(normalized).toEqual({
      consistency: "eventual",
      window: "7d",
      clients: [
        { client: "damus", event_count: 10, unique_authors: 4 },
        { client: "(none)", event_count: 2, unique_authors: 0 },
      ],
      content_flags: {
        events: 12,
        bridged_share: 0.25,
        content_warning_share: 0,
        pow_share: 0.5,
      },
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns an empty client payload when lists and flags are missing", () => {
    expect(normalizeClientStats({ consistency: "eventual" })).toEqual({
      consistency: "eventual",
    });
    expect(normalizeClientStats(null)).toEqual({});
  });

  it("drops invalid client rows after a schema miss", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(normalizeClientStats({ clients: "damus" }).clients).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("keeps identity counts and domain rows, and drops blank domains", () => {
    const normalized = normalizeIdentityStats({
      consistency: "eventual",
      profiles: 8,
      nip05_present: 3,
      nip05_verified: 0,
      avg_completeness: 4.5,
      nip05_domains: [
        { domain: "example.com", count: 2 },
        { domain: "", count: 4 },
      ],
      lud16_domains: [],
    });

    expect(normalized.profiles).toBe(8);
    expect(normalized.nip05_verified).toBe(0);
    expect(normalized.avg_completeness).toBe(4.5);
    expect(normalized.nip05_domains).toEqual([{ domain: "example.com", count: 2 }]);
    expect(normalized.lud16_domains).toBeUndefined();
    expect(normalized.lud16_present).toBeUndefined();
  });

  it("keeps present histogram keys and drops a bad zap day", () => {
    const normalized = normalizeZapStats({
      window: "24h",
      series: [
        {
          day: "2026-11-04",
          zap_count: 3,
          sats_total: 2100,
          histogram: { lt21: 1, gt100k: 2 },
        },
        { day: "yesterday", zap_count: 9 },
        { zap_count: 1 },
      ],
      unique_senders: 4,
    });

    expect(normalized.series).toEqual([
      {
        day: "2026-11-04",
        zap_count: 3,
        sats_total: 2100,
        histogram: { lt21: 1, gt100k: 2 },
      },
    ]);
    expect(normalized.unique_senders).toBe(4);
    expect(normalized.unique_receivers).toBeUndefined();
    expect(normalized.window).toBe("24h");
  });

  it("omits an empty zap histogram object", () => {
    const normalized = normalizeZapStats({
      series: [{ day: "2026-11-04", histogram: {} }],
    });
    expect(normalized.series).toEqual([{ day: "2026-11-04" }]);
  });

  it("keeps account days and active author counts", () => {
    const normalized = normalizeAccountStats({
      new_authors: [
        { day: "2026-11-01", count: 5 },
        { day: "bad", count: 1 },
      ],
      active_authors_1d: 2,
      active_authors_7d: 9,
    });
    expect(normalized).toEqual({
      new_authors: [{ day: "2026-11-01", count: 5 }],
      active_authors_1d: 2,
      active_authors_7d: 9,
    });
  });

  it("returns no account rows from an empty payload", () => {
    expect(normalizeAccountStats({})).toEqual({});
  });

  it("keeps propagation rows and drops a relay without a url", () => {
    const normalized = normalizeRelayPropagation({
      window: "7d",
      relays: [
        {
          relay_url: "wss://relay.example",
          events_seen: 10,
          first_seen_share: 0.4,
          exclusive_share: 0.1,
          latency_p50_ms: 80,
          untrusted_share: 0.02,
        },
        { events_seen: 4 },
      ],
    });
    expect(normalized.relays).toEqual([
      {
        relay_url: "wss://relay.example",
        events_seen: 10,
        first_seen_share: 0.4,
        exclusive_share: 0.1,
        latency_p50_ms: 80,
        untrusted_share: 0.02,
      },
    ]);
  });

  it("keeps overlap pairs and leaves jaccard off when it is absent", () => {
    const normalized = normalizeRelayOverlap({
      window: "30d",
      pairs: [
        { relay_a: "wss://a.example", relay_b: "wss://b.example", shared_events: 12, jaccard: 0.5 },
        { relay_a: "wss://a.example", relay_b: "wss://c.example", shared_events: 3 },
        { relay_a: "wss://a.example" },
      ],
    });
    expect(normalized.pairs).toEqual([
      { relay_a: "wss://a.example", relay_b: "wss://b.example", shared_events: 12, jaccard: 0.5 },
      { relay_a: "wss://a.example", relay_b: "wss://c.example", shared_events: 3 },
    ]);
  });

  it("keeps an author zap series and lifetime totals", () => {
    const normalized = normalizeAuthorZapAnalytics({
      pubkey: "ab",
      window: "7d",
      series: [
        {
          day: "2026-11-04",
          received_count: 1,
          received_sats: 21,
          sent_count: 0,
          sent_sats: 0,
        },
      ],
      inbound_zaps: 4,
      inbound_sats: 100,
      repeat_zappers: 1,
    });
    expect(normalized.series?.[0]?.received_sats).toBe(21);
    expect(normalized.inbound_zaps).toBe(4);
    expect(normalized.repeat_zappers).toBe(1);
    expect(normalized.series?.[0]?.nutzap_received_count).toBeUndefined();
  });

  it("keeps profile identity fields and a blank NIP-05 status", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const normalized = normalizeProfileIdentity({
      pubkey: "ab",
      nip05: "ada@example.com",
      nip05_verified: false,
      nip05_status: "",
      lud16_domain: "getalby.com",
      website_domain: "example.com",
      completeness_score: 6,
      accepts_nutzaps: true,
      consistency: "eventual",
    });
    expect(normalized).toMatchObject({
      pubkey: "ab",
      nip05: "ada@example.com",
      nip05_verified: false,
      nip05_status: "",
      lud16_domain: "getalby.com",
      website_domain: "example.com",
      completeness_score: 6,
      accepts_nutzaps: true,
      consistency: "eventual",
    });
    expect(normalized.name).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns no identity fields from an empty object", () => {
    expect(normalizeProfileIdentity({})).toEqual({});
    expect(normalizeProfileIdentity(null)).toEqual({});
  });

  it("keeps an engagement rate and omits a window that lacks one and a name", () => {
    const normalized = normalizeAuthorAnalyticsSummary({
      pubkey: "ab",
      windows: [
        { window: "7d", engagement_rate_per_post: 1.5, post_count: 4 },
        { window: "30d" },
        {},
      ],
    });
    expect(normalized.windows).toEqual([
      { window: "7d", engagement_rate_per_post: 1.5 },
      { window: "30d" },
    ]);
  });

  it("sorts reaction content, merges duplicates, and caps the list", () => {
    const items = Array.from({ length: 22 }, (_, index) => ({
      content: `e${index}`,
      count: index,
    }));
    items.push({ content: "e21", count: 3 });
    const normalized = normalizeReactionBreakdown([
      { content: "+", count: 2 },
      { content: "❤️", count: 5 },
      { content: "+", count: 1 },
      { content: "-", count: 2 },
      { content: "   ", count: 4 },
      { content: "ok", count: -1 },
      ...items,
    ]);
    expect(normalized[0]).toEqual({ content: "e21", count: 24 });
    expect(normalized.find((item) => item.content === "+")).toEqual({ content: "+", count: 3 });
    expect(normalized.find((item) => item.content === "❤️")?.count).toBe(5);
    expect(normalized).toHaveLength(20);
    expect(normalized.some((item) => item.content === "-")).toBe(false);
  });

  it("returns no reaction chips from a missing breakdown", () => {
    expect(normalizeReactionBreakdown(undefined)).toEqual([]);
    expect(normalizeReactionBreakdown(null)).toEqual([]);
  });

  it("lifts reaction_breakdown onto event counts and drops an empty list", () => {
    const withBreakdown = normalizeEventCountsResponse({
      reply_count: 1,
      reaction_count: 3,
      reaction_breakdown: [
        { content: "😂", count: 2 },
        { content: "+", count: 1 },
      ],
      consistency: "eventual",
    });
    expect(withBreakdown.reaction_breakdown).toEqual([
      { content: "😂", count: 2 },
      { content: "+", count: 1 },
    ]);
    expect(withBreakdown.counts).toMatchObject({ reply_count: 1, reaction_count: 3 });

    const nested = normalizeEventCountsResponse({
      counts: { reaction_count: 2, reaction_breakdown: [{ content: "+", count: 2 }] },
    });
    expect(nested.reaction_breakdown).toEqual([{ content: "+", count: 2 }]);
    expect(nested.counts).not.toHaveProperty("reaction_breakdown");

    const empty = normalizeEventCountsResponse({ reaction_count: 0, reaction_breakdown: [] });
    expect(empty.reaction_breakdown).toBeUndefined();
  });

  it("lists the series metrics the stats selector can request", () => {
    expect(STATS_SERIES_METRICS).toEqual([
      "note_volume",
      "active_authors",
      "relay_events",
      "zap_count_24h",
      "sats_24h",
      "new_authors_24h",
      "nip17_dm_count_24h",
      "bridged_share_bps",
      "group_messages_24h",
      "poll_votes_24h",
      "live_chat_24h",
      "reports_24h",
      "deletions_24h",
      "labels_24h",
      "census_events_24h",
    ]);
  });
});
