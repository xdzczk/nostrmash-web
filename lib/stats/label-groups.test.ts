import { describe, expect, it } from "vitest";

import { groupLabelCounts, labelStatsVisible } from "@/lib/stats/label-groups";

describe("groupLabelCounts", () => {
  it("keeps human namespaces expanded and folds bridge markers into one row", () => {
    const grouped = groupLabelCounts([
      { namespace: "ISO-639-1", label: "en", count: 12 },
      { namespace: "ISO-639-1", label: "de", count: 4 },
      { namespace: "ISO-639-1", label: "ja", count: 3 },
      { namespace: "ISO-639-1", label: "fr", count: 1 },
      { namespace: "content-origin", label: "original", count: 8 },
      {
        namespace: "pink.momostr",
        label: "pink.momostr.activitypub:https://example.test/actor",
        count: 5,
      },
      { namespace: "pub.ditto.trends", label: "rising", count: 2 },
      { namespace: "bridge.example", label: "https://other.example/user", count: 9 },
    ]);

    expect(grouped.namespaces.map((row) => row.namespace)).toEqual(["ISO-639-1", "content-origin"]);
    expect(grouped.namespaces[0]?.top.map((label) => label.label)).toEqual(["en", "de", "ja"]);
    expect(grouped.namespaces[0]?.total).toBe(20);
    expect(grouped.bridge).toEqual({ total: 16, labels: 3 });
  });

  it("hides a labels section whose only figures are zero agreement", () => {
    expect(labelStatsVisible({ language_agreement: { agree: 0, disagree: 0 } })).toBe(false);
    expect(labelStatsVisible({ labels: [{ namespace: "ISO-639-1", label: "en", count: 1 }] })).toBe(
      true
    );
  });
});
