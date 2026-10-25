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

  it("includes the active language on the view event", () => {
    const sink = vi.fn();
    recordDiscoverEvent({ name: "navigation", view: "overview", language: "de" }, sink);
    expect(sink).toHaveBeenCalledWith({
      name: "navigation",
      view: "overview",
      language: "de",
    });
  });
});
