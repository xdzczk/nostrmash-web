import { describe, expect, it } from "vitest";

import { highlightSource } from "@/lib/profile/highlight-source";
import type { EventRecord } from "@/lib/types/api";

function highlight(tags: string[][]): EventRecord {
  return {
    id: "a".repeat(64),
    pubkey: "b".repeat(64),
    kind: 9802,
    content: "A clipped passage",
    tags,
  };
}

describe("highlightSource", () => {
  it("attributes an addressable source ahead of an event tag", () => {
    const source = highlightSource(
      highlight([
        ["e", "c".repeat(64)],
        ["a", `30023:${"b".repeat(64)}:imagine-if`],
      ])
    );
    expect(source).toEqual({
      title: `30023:${"b".repeat(64)}:imagine-if`,
      label: "imagine-if",
    });
  });

  it("links an event source to the note", () => {
    const id = "c".repeat(64);
    expect(highlightSource(highlight([["e", id]]))).toEqual({
      title: id,
      href: `/notes/${id}`,
      label: "a note",
    });
  });

  it("links an r tag to the source page when there is no note or article", () => {
    expect(
      highlightSource(
        highlight([
          ["context", "surrounding"],
          ["r", "https://www.bnonews.com/index.php/story"],
        ])
      )
    ).toEqual({
      title: "https://www.bnonews.com/index.php/story",
      href: "https://www.bnonews.com/index.php/story",
      label: "bnonews.com",
      external: true,
    });
  });

  it("prefers an event source over a page url", () => {
    const id = "c".repeat(64);
    expect(
      highlightSource(
        highlight([
          ["r", "https://bnonews.com/x"],
          ["e", id],
        ])
      )?.href
    ).toBe(`/notes/${id}`);
  });

  it("returns nothing when the highlight has no source", () => {
    expect(highlightSource(highlight([["p", "b".repeat(64)]]))).toBeNull();
  });
});
