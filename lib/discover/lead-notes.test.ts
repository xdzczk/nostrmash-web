import { describe, expect, it } from "vitest";

import { selectSupportingNotes } from "@/lib/discover/lead-notes";
import type { EventRecord } from "@/lib/types/api";

function note(id: string, pubkey: string): EventRecord {
  return { id, pubkey, kind: 1, created_at: 1, content: id, tags: [] };
}

describe("selectSupportingNotes", () => {
  it("skips the lead author and fills the column from later notes", () => {
    const notes = [
      note("lead", "calle"),
      note("same-author", "calle"),
      note("gigi", "gigi"),
      note("white", "white"),
      note("hodl", "hodl"),
    ];
    expect(selectSupportingNotes(notes).map((entry) => entry.id)).toEqual([
      "gigi",
      "white",
      "hodl",
    ]);
  });

  it("returns an empty column when every note is the lead author", () => {
    expect(selectSupportingNotes([note("a", "calle"), note("b", "CALLE")])).toEqual([]);
  });
});
