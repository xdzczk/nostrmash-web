import { describe, expect, it } from "vitest";

import { extractRelayHealthRows } from "@/components/explorer/stats-utils";
import {
  classifyIngestError,
  groupRelayAttention,
  ingestFailureCopy,
} from "@/lib/relays/ingest-errors";

describe("classifyIngestError", () => {
  it("groups dial errors without repeating the raw string", () => {
    expect(
      classifyIngestError(
        "dial websocket: dial tcp: lookup welcome.nostr.wine on 127.0.0.11:53: no such host"
      )
    ).toBe("dns");
    expect(classifyIngestError("dial websocket: websocket: bad handshake")).toBe("handshake");
    expect(
      classifyIngestError("dial websocket: dial tcp 10.0.1.13:443: connect: connection refused")
    ).toBe("refused");
    expect(classifyIngestError("dial websocket: tls: failed to verify certificate: x509")).toBe(
      "certificate"
    );
    expect(classifyIngestError("read tcp 10.0.1.13:55498->1.2.3.4:443: i/o timeout")).toBe(
      "timeout"
    );
    expect(ingestFailureCopy("dns").summary).not.toMatch(/10\.|127\.0\.0\.11/);
  });
});

describe("groupRelayAttention", () => {
  const nowMs = Date.parse("2026-10-25T12:00:00.000Z");

  it("leads with fresh hosts and groups the rest by failure kind", () => {
    const rows = extractRelayHealthRows({
      relays: [
        {
          relay_url: "wss://fresh.example",
          healthy: true,
          latest_checkpoint_at: "2026-10-25T11:00:00.000Z",
        },
        {
          relay_url: "wss://stale.example",
          healthy: true,
          latest_checkpoint_at: "2026-08-01T00:00:00.000Z",
        },
        {
          relay_url: "wss://hand.example",
          healthy: false,
          last_error: "websocket: bad handshake",
          latest_checkpoint_at: "2026-08-01T00:00:00.000Z",
        },
        {
          relay_url: "wss://hand-two.example",
          healthy: false,
          last_error: "websocket: bad handshake",
        },
        {
          relay_url: "wss://dns.example",
          healthy: false,
          last_error: "lookup dns.example: no such host",
        },
      ],
    });

    const { fresh, groups } = groupRelayAttention(rows, nowMs);
    expect(fresh.map((row) => row.host)).toEqual(["fresh.example"]);
    expect(groups.map((group) => [group.id, group.rows.length])).toEqual([
      ["handshake", 2],
      ["dns", 1],
      ["stale", 1],
    ]);
  });
});
