import { describe, expect, it } from "vitest";

import { formatRepostRollup, partitionRelatedNotes } from "./related-notes";
import type { EventRecord } from "@/lib/types/api";

const FOCAL = "a".repeat(64);

function note(partial: EventRecord & { reasons?: string[] }): EventRecord {
  return partial;
}

describe("partitionRelatedNotes", () => {
  it("collapses reposts of the focal note and keeps every other reason", () => {
    const repost = note({
      id: "b".repeat(64),
      pubkey: "c".repeat(64),
      kind: 6,
      reasons: ["repost_linkage"],
      tags: [["e", FOCAL]],
    });
    const quote = note({
      id: "d".repeat(64),
      pubkey: "e".repeat(64),
      kind: 1,
      content: "quoting",
      reasons: ["quote_linkage"],
    });
    const unknown = note({
      id: "f".repeat(64),
      pubkey: "1".repeat(64),
      kind: 1,
      content: "something new",
      reasons: ["future_reason"],
    });
    const { reposts, mentions } = partitionRelatedNotes([repost, quote, unknown], FOCAL);
    expect(reposts.map((entry) => entry.id)).toEqual([repost.id]);
    expect(mentions.map((entry) => entry.id)).toEqual([quote.id, unknown.id]);
  });
});

describe("formatRepostRollup", () => {
  it("names the first two people and counts the rest", () => {
    expect(formatRepostRollup(["Marco", "Flix", "Ada"], 22)).toBe(
      "Reposted by Marco, Flix, and 20 others"
    );
    expect(formatRepostRollup(["Rhea"], 1)).toBe("Reposted by Rhea");
    expect(formatRepostRollup([], 0)).toBe("No reposts have been indexed yet.");
  });
});
