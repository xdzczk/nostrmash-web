import { describe, expect, it } from "vitest";

import { sharedTopicLine } from "@/lib/discover/stories";
import type { EventRecord } from "@/lib/types/api";

function note(id: string, pubkey: string, tag: string): EventRecord {
  return { id, pubkey, tags: [["t", tag]], content: "" };
}

describe("sharedTopicLine", () => {
  it("names the hashtag shared by the lead and other ranked notes", () => {
    expect(
      sharedTopicLine([
        note("a", "aa", "zapstore"),
        note("b", "bb", "zapstore"),
        note("c", "cc", "zapstore"),
        note("d", "dd", "bitcoin"),
      ])
    ).toBe("2 other notes from 3 people in this ranking also use #zapstore.");
  });

  it("stays quiet when the ranked notes do not share a topic", () => {
    expect(sharedTopicLine([note("a", "aa", "one"), note("b", "bb", "two")])).toBeNull();
  });
});
