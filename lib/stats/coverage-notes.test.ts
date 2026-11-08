import { describe, expect, it } from "vitest";

import { coverageChangeLabel, coverageNotesFromChanges } from "@/lib/stats/coverage-notes";

describe("coverage notes", () => {
  const noon = Date.parse("2026-07-28T12:00:00.000Z");

  it("uses the logged label for that UTC day", () => {
    const notes = coverageNotesFromChanges({
      items: [
        {
          occurred_at: "2026-07-28T12:00:00.000Z",
          host: "relay.example.com",
          change: "added",
          label: "Added relay.example.com",
        },
        {
          occurred_at: "2026-07-28T18:00:00.000Z",
          host: "relay.other.example.com",
          change: "dropped",
        },
      ],
    });
    expect(coverageChangeLabel(noon, notes)).toBe(
      "Added relay.example.com · Dropped relay.other.example.com"
    );
  });

  it("keeps the generic sentence when that day has no log row", () => {
    expect(coverageChangeLabel(noon, [])).toBe("Index coverage changed on 2026-07-28");
  });
});
