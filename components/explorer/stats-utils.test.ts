import { describe, expect, it } from "vitest";

import {
  collectStatsArraySections,
  extractRelayHealthRows,
  extractRelayRows,
  flattenPrimitiveStats,
  formatRelayHealthSummary,
  partitionRelayHealth,
  pickTopPrimitiveStats,
  rankRelayActivity,
  relayDisplayLabel,
  relayHealthPosture,
  selectRelayHealthForHost,
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

  it("maps NostrMash checkpoint statuses to unhealthy and preserves last_error", () => {
    const payload = {
      relays: [
        { relay_url: "wss://relay.primal.net", status: "healthy" },
        {
          relay_url: "wss://relay.damus.io",
          status: "errored",
          last_error: "dial websocket: websocket: bad handshake",
        },
        { relay_url: "wss://nos.lol", status: "disconnected" },
        { relay_url: "wss://relay.example", status: "backing_off" },
        { relay_url: "wss://connecting.example", status: "connecting" },
      ],
    };

    const rows = extractRelayHealthRows(payload, 10);
    const posture = relayHealthPosture(rows);

    expect(rows.find((row) => row.host === "relay.damus.io")).toMatchObject({
      healthy: false,
      status: "errored",
      lastError: "dial websocket: websocket: bad handshake",
    });
    expect(rows.find((row) => row.host === "nos.lol")?.healthy).toBe(false);
    expect(rows.find((row) => row.host === "relay.example")?.healthy).toBe(false);
    expect(rows.find((row) => row.host === "connecting.example")?.healthy).toBeUndefined();
    expect(posture).toEqual({ total: 5, healthy: 1, unhealthy: 3, unknown: 1 });
  });

  it("maps latest_checkpoint_at and ingest fields from the health API", () => {
    const payload = {
      relays: [
        {
          relay_url: "wss://relay.one",
          mode: "live",
          filter_group: "social_core",
          status: "healthy",
          latest_checkpoint_at: "2026-04-04T12:00:00Z",
          eose_seen_at: "2026-04-04T11:59:00Z",
        },
      ],
    };

    expect(extractRelayHealthRows(payload, 10)[0]).toMatchObject({
      host: "relay.one",
      status: "healthy",
      healthy: true,
      mode: "live",
      filterGroup: "social_core",
      latestCheckpointAt: "2026-04-04T12:00:00Z",
      eoseSeenAt: "2026-04-04T11:59:00Z",
      lastSeenAt: "2026-04-04T12:00:00Z",
    });
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

  it("collapses the same relay leaf emitted under several prefixes", () => {
    // Mirrors /discovery/stats/network: relays.active_24h is flattened as
    // `network_relays_active_24h`, `relays_active_24h` and bare `active_24h`.
    const payload = {
      network: {
        activity: {
          active_authors: { "24h": 3994, "7d": 8599 },
          note_volume: { "24h": 42333, "7d": 308338 },
        },
        relays: {
          active_24h: 11,
          active_7d: 11,
          event_volume: { "24h": 456038, "7d": 3087198 },
          total: 216,
        },
      },
    };

    const picked = pickTopPrimitiveStats(
      payload,
      [
        "active_authors_24h",
        "note_volume_24h",
        "network_relays_active_24h",
        "relays_active_24h",
        "active_24h",
        "event_volume_24h",
      ],
      4,
      "24h"
    );

    expect(picked.map((stat) => stat.label)).toEqual([
      "active_authors_24h",
      "note_volume_24h",
      "network_relays_active_24h",
      "event_volume_24h",
    ]);
    expect(picked.filter((stat) => stat.value === 11)).toHaveLength(1);
  });

  it("does not repeat a stat when the 24h and 7d keys collapse to one window", () => {
    const payload = {
      network: {
        activity: {
          active_authors: { "24h": 3902, "7d": 8657 },
          note_volume: { "24h": 41653, "7d": 303798 },
        },
      },
    };

    const picked = pickTopPrimitiveStats(
      payload,
      ["active_authors_24h", "active_authors_7d", "note_volume_24h", "note_volume_7d"],
      6,
      "24h"
    );

    expect(picked).toEqual([
      { label: "active_authors_24h", value: 3902 },
      { label: "note_volume_24h", value: 41653 },
    ]);
  });
});

describe("partitionRelayHealth", () => {
  const nowMs = Date.parse("2026-10-24T12:00:00.000Z");

  it("leads with unhealthy and stale checkpoints, and keeps fresh healthy rows apart", () => {
    const rows = extractRelayHealthRows(
      {
        relays: [
          {
            relay_url: "wss://fresh.example",
            healthy: true,
            latest_checkpoint_at: "2026-10-24T11:00:00.000Z",
          },
          {
            relay_url: "wss://stale.example",
            healthy: true,
            latest_checkpoint_at: "2026-08-30T07:00:00.000Z",
            mode: "live",
          },
          {
            relay_url: "wss://down.example",
            healthy: false,
            latest_checkpoint_at: "2026-10-24T10:00:00.000Z",
          },
        ],
      },
      10
    );

    const { attention, current } = partitionRelayHealth(rows, nowMs);
    expect(attention.map((row) => row.host)).toEqual(["down.example", "stale.example"]);
    expect(current.map((row) => row.host)).toEqual(["fresh.example"]);
  });

  it("keeps path relays apart and counts checks, not just hosts", () => {
    const rows = extractRelayHealthRows(
      {
        relays: [
          {
            relay_url: "wss://relay.example/alpha",
            status: "errored",
            latest_checkpoint_at: "2026-08-29T00:00:00.000Z",
          },
          {
            relay_url: "wss://relay.example/beta",
            status: "healthy",
            latest_checkpoint_at: "2026-10-24T11:00:00.000Z",
          },
          {
            relay_url: "wss://fresh.example",
            status: "healthy",
            latest_checkpoint_at: "2026-10-24T11:30:00.000Z",
          },
        ],
      },
      10
    );

    expect(relayDisplayLabel(rows[0]?.relay ?? "", rows[0]?.host ?? "")).toBe(
      "relay.example/alpha"
    );
    expect(formatRelayHealthSummary(rows, nowMs)).toBe(
      "1 of 3 checks is unhealthy. These checks cover 2 hosts. 2 checked in healthy within the last day."
    );
    expect(selectRelayHealthForHost(rows, "relay.example", nowMs)).toMatchObject({
      count: 2,
      row: { relay: "wss://relay.example/alpha" },
    });
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
