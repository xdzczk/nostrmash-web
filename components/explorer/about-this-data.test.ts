import { describe, expect, it } from "vitest";

import { readStatsSections } from "./about-this-data";

describe("readStatsSections", () => {
  it("keeps stats section notes and ignores note-list sections", () => {
    const notes = readStatsSections(
      {
        sections: {
          notes: [{ id: "note-1" }],
          active_authors: {
            scope: "indexed_notes",
            trust_applied: false,
            summary: "Distinct authors of those notes.",
            computed_at: { "24h": "2026-10-24T14:00:00.000Z" },
          },
        },
      },
      {
        sections: {
          active_authors: { summary: "A later duplicate should not replace the first note." },
          relays: { summary: "Relays that have delivered events." },
        },
      }
    );

    expect(notes.map((note) => note.id)).toEqual(["active_authors", "relays"]);
    expect(notes[0]).toMatchObject({
      scope: "indexed_notes",
      trustApplied: false,
      summary: "Distinct authors of those notes.",
      computedAt: [{ label: "24h", at: "2026-10-24T14:00:00.000Z" }],
    });
  });
});
