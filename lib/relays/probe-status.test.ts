import { describe, expect, it } from "vitest";

import { displayProbeStatus, recordedProbeStatus } from "@/lib/relays/probe-status";
import type { RelayProbeHealthEntry } from "@/lib/types/api";

function relay(overrides: Partial<RelayProbeHealthEntry>): RelayProbeHealthEntry {
  return {
    normalized_url: "wss://relay.example",
    admission_state: "inactive",
    probe_fail_rate: 0,
    ...overrides,
  };
}

describe("probe status", () => {
  it("follows the latest checks when the recorded status disagrees", () => {
    const entry = relay({
      last_probe_status: "subscribe_failed",
      last_connect_ok: true,
      last_subscribe_ok: true,
      last_eose_ok: false,
    });

    expect(displayProbeStatus(entry)).toBe("end of events failed");
    expect(recordedProbeStatus(entry)).toBe("subscribe failed");
  });

  it("does not flag an eose timeout that matches a failed end-of-events check", () => {
    const entry = relay({
      last_probe_status: "eose_timeout",
      last_connect_ok: true,
      last_subscribe_ok: true,
      last_eose_ok: false,
    });

    expect(displayProbeStatus(entry)).toBe("end of events failed");
    expect(recordedProbeStatus(entry)).toBeNull();
  });
});
