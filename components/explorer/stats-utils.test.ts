import { describe, expect, it } from "vitest";

import {
  collectStatsArraySections,
  extractRelayHealthRows,
  extractRelayRows,
  flattenPrimitiveStats,
  pickTopPrimitiveStats,
  rankRelayActivity,
  relayHealthPosture,
} from "./stats-utils";

describe("extractRelayRows", () => {
  it("reads relay activity rows from nested relays.top payloads", () => {
    const payload = {
      consistency: "eventual",
      relays: {
        active_24h: 22,
        top: [
          { relay_url: "wss://relay.primal.net", event_count: 307943, unique_authors: 12823 },
          { relay_url: "wss://nos.lol", event_count: 283889, unique_authors: 11793 },
        ],
      },
    };

    const rows = extractRelayRows(payload, 10);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.relay).toBe("wss://relay.primal.net");
    expect(rows[0]?.metrics.event_count).toBe(307943);
  });

  it("still reads top-level relay arrays", () => {
    const payload = {
      relays: [{ relay_url: "wss://relay.damus.io", event_count: 42 }],
    };

    expect(extractRelayRows(payload, 5)).toEqual([
      {
        relay: "wss://relay.damus.io",
        metrics: { event_count: 42 },
      },
    ]);
  });
});

describe("rankRelayActivity", () => {
  it("ranks nested relay stats by activity score", () => {
    const payload = {
      relays: {
        top: [
          { relay_url: "wss://relay.primal.net", event_count: 100 },
          { relay_url: "wss://nos.lol", event_count: 250 },
        ],
      },
    };

    const ranked = rankRelayActivity(payload, 5);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.relay).toBe("wss://nos.lol");
    expect(ranked[0]?.rank).toBe(1);
  });
});

describe("extractRelayHealthRows", () => {
  it("maps status strings to healthy posture counts", () => {
    const payload = {
      relays: [
        { relay_url: "wss://nos.lol", status: "healthy" },
        { relay_url: "wss://bad.example", status: "unhealthy" },
        { relay_url: "wss://unknown.example", status: "pending" },
      ],
    };

    const rows = extractRelayHealthRows(payload, 10);
    const posture = relayHealthPosture(rows);

    expect(rows[0]?.healthy).toBe(true);
    expect(rows[1]?.healthy).toBe(false);
    expect(rows[2]?.healthy).toBeUndefined();
    expect(posture).toEqual({ total: 3, healthy: 1, unhealthy: 1, unknown: 1 });
  });
});

describe("flattenPrimitiveStats", () => {
  it("flattens nested network and content stats payloads", () => {
    const network = {
      consistency: "eventual",
      network: {
        activity: {
          active_authors: { "24h": 8250, "7d": 8252 },
          note_volume: { "24h": 59876, "7d": 59879 },
        },
        relays: {
          active_24h: 22,
          event_volume: { "24h": 1062843, "7d": 1062887 },
        },
      },
    };
    const content = {
      content: {
        note_volume: { "24h": 60433, "7d": 60436 },
      },
    };

    const networkStats = flattenPrimitiveStats(network.network);
    expect(networkStats).toEqual(
      expect.arrayContaining([
        { label: "active_authors_24h", value: 8250 },
        { label: "note_volume_24h", value: 59876 },
        { label: "active_24h", value: 22 },
        { label: "event_volume_24h", value: 1062843 },
      ])
    );

    expect(pickTopPrimitiveStats(network, ["active_authors_24h", "note_volume_24h"], 2)).toEqual([
      { label: "active_authors_24h", value: 8250 },
      { label: "note_volume_24h", value: 59876 },
    ]);

    expect(pickTopPrimitiveStats(content, ["note_volume_24h"], 1)).toEqual([
      { label: "note_volume_24h", value: 60433 },
    ]);
  });

  it("excludes computed_at timestamps and unique_authors when active_authors is present", () => {
    const payload = {
      network: {
        computed_at: "2026-07-28T12:00:00.000Z",
        active_authors_24h: 8250,
        unique_authors_24h: 8100,
        note_volume_24h: 59876,
      },
    };

    const picked = pickTopPrimitiveStats(
      payload,
      ["active_authors_24h", "unique_authors_24h", "note_volume_24h", "computed_at"],
      6
    );

    const labels = picked.map((stat) => stat.label);
    expect(labels).toContain("active_authors_24h");
    expect(labels).toContain("note_volume_24h");
    expect(labels.some((label) => label.includes("unique_authors"))).toBe(false);
    expect(labels).not.toContain("computed_at");
    expect(flattenPrimitiveStats(payload.network).map((stat) => stat.label)).not.toContain(
      "computed_at"
    );
  });
});

describe("collectStatsArraySections", () => {
  it("finds nested leaderboard arrays such as top_hashtags.24h", () => {
    const payload = {
      content: {
        top_hashtags: {
          "24h": [{ hashtag: "nostr", event_count: 357 }],
        },
      },
    };

    expect(collectStatsArraySections(payload, 2)).toEqual([
      {
        label: "top_hashtags.24h",
        value: [{ hashtag: "nostr", event_count: 357 }],
      },
    ]);
  });
});
