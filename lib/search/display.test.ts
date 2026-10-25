import { describe, expect, it } from "vitest";

import {
  collapseRepeatedAuthors,
  continuationToken,
  decodeContinuation,
  displayQuery,
  leadsWithExactProfile,
  searchProfileContextLine,
  searchResultSubtitle,
} from "@/lib/search/display";
import type { EventRecord, Profile } from "@/lib/types/api";

describe("search display", () => {
  it("strips wrapping quotes from the visible query", () => {
    expect(displayQuery('"not your keys"')).toBe("not your keys");
    expect(displayQuery("bitcoin")).toBe("bitcoin");
  });

  it("describes an index total and a page of matches differently", () => {
    expect(
      searchResultSubtitle("bitcoin", {
        totals_source: "api",
        section_totals: { notes: 134211 },
      })
    ).toBe(`About ${(134211).toLocaleString()} notes mention bitcoin.`);
    expect(
      searchResultSubtitle("bitcoin", { totals_source: "page", section_totals: { notes: 20 } })
    ).toBe("Top matches across notes, people, topics, and relays.");
  });

  it("encodes a full page as an offset token and prefers a real cursor", () => {
    expect(continuationToken(undefined, 20, 20)).toBe("offset:20");
    expect(continuationToken("cursor_2", 20, 20)).toBe("cursor_2");
    expect(continuationToken(undefined, 4, 20)).toBeUndefined();
    expect(decodeContinuation("offset:40")).toEqual({ offset: 40 });
    expect(decodeContinuation("cursor_2")).toEqual({ cursor: "cursor_2" });
  });

  it("leads with profiles only when one profile is an exact identity match", () => {
    const fiatjaf = { pubkey: "a".repeat(64), name: "fiatjaf" } satisfies Profile;
    const other = { pubkey: "b".repeat(64), name: "someone" } satisfies Profile;
    expect(leadsWithExactProfile("fiatjaf", [fiatjaf, other])).toBe(true);
    expect(
      leadsWithExactProfile("bitcoin", [
        { pubkey: "a".repeat(64), name: "Bitcoin" },
        { pubkey: "b".repeat(64), display_name: "bitcoin" },
      ])
    ).toBe(false);
    expect(leadsWithExactProfile("jack dorsey", [fiatjaf])).toBe(false);
  });

  it("keeps two notes per author and counts the rest", () => {
    const notes = [1, 2, 3, 4].map(
      (index) =>
        ({
          id: String(index),
          pubkey: index === 4 ? "c".repeat(64) : "b".repeat(64),
          content: String(index),
        }) satisfies EventRecord
    );
    const collapsed = collapseRepeatedAuthors(notes, 2);
    expect(collapsed.notes.map((note) => note.id)).toEqual(["1", "2", "4"]);
    expect(collapsed.extras).toEqual([{ pubkey: "b".repeat(64), hidden: 1 }]);
  });

  it("summarizes a search profile with followers, recent notes, and nip05", () => {
    expect(
      searchProfileContextLine({
        follower_count: 12400,
        recent_post_count: 38,
        nip05: "bitcoin@nostrich.org",
      })
    ).toBe(`12.4K followers · ${(38).toLocaleString()} notes this week · bitcoin@nostrich.org`);
    expect(searchProfileContextLine({ follower_count: 0, recent_post_count: 0 })).toBeUndefined();
  });
});
