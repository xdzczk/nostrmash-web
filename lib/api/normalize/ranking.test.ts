import { describe, expect, it } from "vitest";

import { mapNoteWhyNow } from "@/components/explorer/why-now";
import { normalizeEventRecord, normalizeProfile } from "@/lib/api/normalize";
import { normalizeDiscoveryListMeta, normalizeDiscoveryRanking } from "@/lib/api/normalize/ranking";

describe("discovery ranking normalization", () => {
  it("preserves supported optional ranking evidence and drops malformed entries", () => {
    expect(
      normalizeDiscoveryRanking({
        rank: 2,
        score: 17.5,
        source_breadth: 12,
        confidence: "high",
        reasons: [
          {
            code: "reply_velocity",
            evidence: [{ metric: "reply_count", value: 42, unit: "replies" }],
          },
          { code: "", evidence: [] },
        ],
      })
    ).toEqual({
      rank: 2,
      score: 17.5,
      source_breadth: 12,
      confidence: "high",
      reasons: [
        {
          code: "reply_velocity",
          evidence: [{ metric: "reply_count", value: 42, unit: "replies" }],
        },
      ],
    });
    expect(normalizeDiscoveryRanking({ rank: 0, score: 1 })).toBeUndefined();
  });

  it("preserves ranking through event and profile normalization", () => {
    const ranking = { rank: 1, score: 9, reasons: [{ code: "publishing_momentum" }] };
    const event = normalizeEventRecord({ id: "a".repeat(64), ranking });
    const profile = normalizeProfile({ pubkey: "profile-key", ranking });

    expect(event?.ranking?.rank).toBe(1);
    expect(profile?.ranking?.reasons?.[0]?.code).toBe("publishing_momentum");
  });

  it("prefers server reasons over inferred engagement heuristics", () => {
    const note = normalizeEventRecord({
      id: "b".repeat(64),
      reply_count: 99,
      ranking: {
        rank: 1,
        score: 10,
        reasons: [
          {
            code: "repost_lift",
            evidence: [{ metric: "repost_count", value: 7, unit: "reposts" }],
          },
        ],
      },
    });

    expect(note).not.toBeNull();
    expect(mapNoteWhyNow(note!)).toEqual([{ text: "repost lift", support: "7 reposts" }]);
  });

  it("normalizes list metadata independently from item data", () => {
    expect(
      normalizeDiscoveryListMeta({
        window: "7d",
        computed_at: "2026-07-30T12:00:00Z",
        ranking_version: "discovery-v1",
        confidence: "medium",
      })
    ).toEqual({
      window: "7d",
      computed_at: "2026-07-30T12:00:00Z",
      ranking_version: "discovery-v1",
      confidence: "medium",
    });
  });
});
