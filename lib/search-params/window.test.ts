import { describe, expect, it } from "vitest";

import { buildWindowHref, parseStatsWindow, preferredMetricKeysForWindow } from "./window";
import {
  collectStatsArraySections,
  filterPrimitiveStatsForWindow,
  pickTopPrimitiveStats,
} from "@/components/explorer/stats-utils";

describe("parseStatsWindow", () => {
  it("defaults to 24h and accepts 7d", () => {
    expect(parseStatsWindow(undefined)).toBe("24h");
    expect(parseStatsWindow("7d")).toBe("7d");
    expect(parseStatsWindow("30d")).toBe("24h");
  });
});

describe("buildWindowHref", () => {
  it("sets window and clears pagination params", () => {
    const current = new URLSearchParams({ cursor: "abc", window: "24h" });
    expect(buildWindowHref("/trending", current, "7d")).toBe("/trending?window=7d");
  });

  it("removes window param for the default window", () => {
    const current = new URLSearchParams({ window: "7d", cursor: "abc" });
    expect(buildWindowHref("/trending", current, "24h")).toBe("/trending");
  });
});

describe("window-aware stats helpers", () => {
  it("prefers 7d metrics when requested", () => {
    const payload = {
      network: {
        activity: {
          active_authors: { "24h": 100, "7d": 200 },
        },
      },
    };

    expect(
      pickTopPrimitiveStats(
        payload,
        preferredMetricKeysForWindow(["active_authors_24h"], "7d"),
        1,
        "7d"
      )
    ).toEqual([{ label: "active_authors_7d", value: 200 }]);
  });

  it("filters primitive stats and array sections by window", () => {
    const stats = [
      { label: "note_volume_24h", value: 1 },
      { label: "note_volume_7d", value: 2 },
      { label: "total", value: 3 },
    ];
    expect(filterPrimitiveStatsForWindow(stats, "7d")).toEqual([
      { label: "note_volume_7d", value: 2 },
      { label: "total", value: 3 },
    ]);

    const payload = {
      content: {
        top_hashtags: {
          "24h": [{ hashtag: "nostr" }],
          "7d": [{ hashtag: "bitcoin" }],
        },
      },
    };
    expect(collectStatsArraySections(payload, 2, "7d")).toEqual([
      { label: "top_hashtags.7d", value: [{ hashtag: "bitcoin" }] },
    ]);
  });
});
