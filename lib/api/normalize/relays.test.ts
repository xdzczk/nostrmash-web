import { describe, expect, it } from "vitest";

import {
  normalizeRelayHealthResponse,
  relayHealthyFromObservation,
} from "@/lib/api/normalize/relays";

describe("relayHealthyFromObservation", () => {
  it("maps NostrMash checkpoint statuses", () => {
    expect(relayHealthyFromObservation({ status: "healthy" })).toBe(true);
    expect(relayHealthyFromObservation({ status: "errored" })).toBe(false);
    expect(relayHealthyFromObservation({ status: "disconnected" })).toBe(false);
    expect(relayHealthyFromObservation({ status: "backing_off" })).toBe(false);
    expect(relayHealthyFromObservation({ status: "failed" })).toBe(false);
    expect(relayHealthyFromObservation({ status: "connecting" })).toBeUndefined();
  });
});

describe("normalizeRelayHealthResponse", () => {
  it("derives healthy and keeps last_error", () => {
    const normalized = normalizeRelayHealthResponse({
      relays: [
        {
          relay_url: "wss://relay.damus.io",
          status: "errored",
          last_error: "dial websocket: websocket: bad handshake",
        },
      ],
    });

    expect(normalized.relays?.[0]).toMatchObject({
      relay_url: "wss://relay.damus.io",
      status: "errored",
      healthy: false,
      last_error: "dial websocket: websocket: bad handshake",
    });
  });

  it("maps ingest checkpoint fields onto the health contract", () => {
    const normalized = normalizeRelayHealthResponse({
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
    });

    expect(normalized.relays?.[0]).toMatchObject({
      relay_url: "wss://relay.one",
      status: "healthy",
      healthy: true,
      mode: "live",
      filter_group: "social_core",
      latest_checkpoint_at: "2026-04-04T12:00:00Z",
      eose_seen_at: "2026-04-04T11:59:00Z",
      last_seen_at: "2026-04-04T12:00:00Z",
    });
  });
});
