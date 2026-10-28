import { describe, expect, it } from "vitest";

import {
  collectStatsArraySections,
  filterPrimitiveStatsForWindow,
  pickTopPrimitiveStats,
} from "@/components/explorer/stats-utils";
import { safeInternalPath } from "@/lib/discover/discovery-window-session";
import {
  buildWindowHref,
  fallbackAfterRejected30d,
  formatDiscoveryWindowEyebrow,
  parseStatsWindow,
  preferredMetricKeysForWindow,
  relayStatsWindow,
  selectableStatsWindows,
} from "./window";

describe("parseStatsWindow", () => {
  it("defaults to 24h and accepts 7d and 30d", () => {
    expect(parseStatsWindow(undefined)).toBe("24h");
    expect(parseStatsWindow("7d")).toBe("7d");
    expect(parseStatsWindow("30d")).toBe("30d");
    expect(parseStatsWindow("90d")).toBe("24h");
  });
});

describe("30d fallback", () => {
  it("keeps the default range and hides 30d only after a 400", () => {
    expect(fallbackAfterRejected30d("30d", "7d", 400)).toEqual({ window: "7d", hide30d: true });
    expect(fallbackAfterRejected30d("30d", "24h", 500)).toEqual({ window: "30d", hide30d: false });
    expect(fallbackAfterRejected30d("7d", "24h", 400)).toEqual({ window: "7d", hide30d: false });
    expect(selectableStatsWindows(false)).toEqual(["24h", "7d"]);
    expect(selectableStatsWindows(true)).toEqual(["24h", "7d", "30d"]);
  });

  it("does not send relay stats a 30d window", () => {
    expect(relayStatsWindow("30d")).toBe("24h");
    expect(relayStatsWindow("7d")).toBe("7d");
  });

  it("labels the month range the same way as the day and the week", () => {
    expect(formatDiscoveryWindowEyebrow("24h")).toBe("Today");
    expect(formatDiscoveryWindowEyebrow("7d")).toBe("This week");
    expect(formatDiscoveryWindowEyebrow("30d")).toBe("This month");
  });

  it("only accepts a relative next path after a rejected 30d", () => {
    expect(safeInternalPath("/trending/notes?window=7d")).toBe("/trending/notes?window=7d");
    expect(safeInternalPath("//evil.example")).toBe("/");
    expect(safeInternalPath("https://evil.example")).toBe("/");
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

  it("preserves an existing lang param", () => {
    const current = new URLSearchParams({ lang: "de", cursor: "abc" });
    expect(buildWindowHref("/trending/notes", current, "7d")).toBe(
      "/trending/notes?lang=de&window=7d"
    );
    expect(buildWindowHref("/trending/notes", current, "30d")).toBe(
      "/trending/notes?lang=de&window=30d"
    );
    expect(buildWindowHref("/trending/notes", current, "24h")).toBe("/trending/notes?lang=de");
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
    expect(
      filterPrimitiveStatsForWindow(
        [
          ...stats,
          { label: "note_volume_30d", value: 4 },
          { label: "relays_active_24h", value: 11 },
          { label: "event_volume_24h", value: 20 },
        ],
        "30d"
      )
    ).toEqual([
      { label: "total", value: 3 },
      { label: "note_volume_30d", value: 4 },
      { label: "relays_active_24h", value: 11 },
      { label: "event_volume_24h", value: 20 },
    ]);
    expect(
      preferredMetricKeysForWindow(
        ["active_authors_24h", "network_relays_active_7d", "event_volume_7d"],
        "30d"
      )
    ).toEqual(["active_authors_30d", "network_relays_active_24h", "event_volume_24h"]);

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

    const month = {
      content: {
        top_hashtags: {
          "24h": [{ hashtag: "nostr" }],
          "7d": [{ hashtag: "bitcoin" }],
          "30d": [{ hashtag: "nostr" }],
        },
        top_languages: {
          "30d": [{ language: "en" }],
        },
      },
    };
    expect(collectStatsArraySections(month, 2, "30d")).toEqual([
      { label: "top_hashtags.30d", value: [{ hashtag: "nostr" }] },
      { label: "top_languages.30d", value: [{ language: "en" }] },
    ]);
  });
});
