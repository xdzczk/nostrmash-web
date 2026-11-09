import { describe, expect, it, vi } from "vitest";

import { mergeRankedArticle } from "@/lib/discover/hydrate-articles";
import { LONG_FORM_KIND, type EventRecord } from "@/lib/types/api";

vi.mock("@/lib/api/profile-hydration", () => ({
  fetchEventsById: vi.fn(async () => ({})),
}));

const RANKED: EventRecord = {
  id: "a".repeat(64),
  pubkey: "b".repeat(64),
  kind: LONG_FORM_KIND,
  content: "Applesauce v7.1 is out and the changelog follows.",
  tags: [],
  reply_count: 4,
  ranking: { rank: 1, score: 9 },
};

describe("mergeRankedArticle", () => {
  it("keeps ranking metrics and takes the title tag from the stored event", () => {
    const merged = mergeRankedArticle(RANKED, {
      id: RANKED.id,
      pubkey: RANKED.pubkey,
      kind: LONG_FORM_KIND,
      content: "Applesauce v7.1 is out and the changelog follows.",
      tags: [
        ["title", "Applesauce v7.1"],
        ["summary", "Messaging clients"],
      ],
      reply_count: 0,
    });

    expect(merged.tags).toEqual([
      ["title", "Applesauce v7.1"],
      ["summary", "Messaging clients"],
    ]);
    expect(merged.reply_count).toBe(4);
    expect(merged.ranking).toEqual({ rank: 1, score: 9 });
  });

  it("returns the ranking row when the stored event is missing", () => {
    expect(mergeRankedArticle(RANKED)).toBe(RANKED);
  });
});
