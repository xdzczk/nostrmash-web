import { describe, expect, it } from "vitest";

import { mergeRankedMediaEvent } from "@/lib/discover/media-rankings";
import type { EventRecord } from "@/lib/types/api";

const ranked = {
  id: "a".repeat(64),
  pubkey: "b".repeat(64),
  content: "caption from the ranking",
  score: 12,
  ranking: { rank: 1, score: 12 },
  reaction_count: 4,
} as EventRecord;

describe("mergeRankedMediaEvent", () => {
  it("keeps the ranking and uses the stored event for tags and kind", () => {
    const merged = mergeRankedMediaEvent(
      ranked,
      {
        id: "a".repeat(64),
        kind: 34236,
        content: "stored description",
        tags: [
          ["title", "Cliff"],
          ["d", "cliff"],
        ],
        reaction_count: 0,
      } as EventRecord,
      "shorts"
    );

    expect(merged.kind).toBe(34236);
    expect(merged.tags).toEqual([
      ["title", "Cliff"],
      ["d", "cliff"],
    ]);
    expect(merged.content).toBe("stored description");
    expect(merged.ranking).toEqual({ rank: 1, score: 12 });
    expect(merged.reaction_count).toBe(4);
  });

  it("stamps the format kind when neither row has one", () => {
    expect(mergeRankedMediaEvent(ranked, undefined, "pictures").kind).toBe(20);
    expect(mergeRankedMediaEvent(ranked, undefined, "videos").kind).toBe(21);
    expect(mergeRankedMediaEvent(ranked, undefined, "shorts").kind).toBe(22);
  });
});
