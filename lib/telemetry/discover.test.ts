import { describe, expect, it, vi } from "vitest";

import { recordDiscoverEvent } from "./discover";

describe("Discover telemetry", () => {
  it("emits only the bounded product context supplied by the event contract", () => {
    const sink = vi.fn();
    recordDiscoverEvent({ name: "reason_source", view: "notes", source: "server" }, sink);

    expect(sink).toHaveBeenCalledWith({
      name: "reason_source",
      view: "notes",
      source: "server",
    });
    expect(JSON.stringify(sink.mock.calls)).not.toMatch(/content|pubkey|event_id|hashtag|domain/);
  });
});
