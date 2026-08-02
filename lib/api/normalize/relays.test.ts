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
});
