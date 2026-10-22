import { describe, expect, it } from "vitest";

import { referencedNoteIds } from "./referenced-notes";

const quote = "c".repeat(64);
const mention = "d".repeat(64);
const reference = "e".repeat(64);
const self = "a".repeat(64);

describe("referencedNoteIds", () => {
  it("keeps quotes, mentions, and the reference id", () => {
    expect(
      referencedNoteIds(
        {
          tags: [
            ["e", "b".repeat(64), "", "root"],
            ["e", self, "", "reply"],
            ["e", mention, "", "mention"],
            ["q", quote],
            ["p", "f".repeat(64)],
          ],
        },
        { reference_event_id: reference },
        self
      )
    ).toEqual([reference, quote, mention]);
  });

  it("ignores hex ids buried in quote activity", () => {
    expect(
      referencedNoteIds(
        { tags: [] },
        {
          linkage: {
            recent_activity: [{ event_id: "1".repeat(64), actor_pubkey: "2".repeat(64) }],
          },
        },
        self
      )
    ).toEqual([]);
  });
});
