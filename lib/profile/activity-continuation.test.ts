import { describe, expect, it } from "vitest";

import {
  encodeProfileContinuation,
  parseProfileContinuation,
  profileActivityAnchor,
  profileActivityHasItems,
} from "@/lib/profile/activity-continuation";

const empty = {
  notes: [],
  replies: [],
  reactions: [],
  zaps: [],
  longFormArticles: [],
  bookmarks: [],
  highlights: [],
  mutedProfiles: [],
  mutedByProfiles: [],
};

describe("profile activity continuation", () => {
  it("round-trips a cursor and its anchor", () => {
    const token = encodeProfileContinuation("next-page", "a".repeat(64));
    expect(parseProfileContinuation(token)).toEqual({
      cursor: "next-page",
      anchor: "a".repeat(64),
    });
    expect(parseProfileContinuation("raw-cursor")).toBeNull();
  });

  it("keeps a cursor that itself contains colons", () => {
    const token = encodeProfileContinuation("abc:def:ghi", "note");
    expect(parseProfileContinuation(token)?.cursor).toBe("abc:def:ghi");
  });

  it("anchors the active tab and ignores the others", () => {
    const data = {
      ...empty,
      activityTab: "notes" as const,
      notes: [{ id: "note-1" }],
      replies: [{ id: "reply-1" }],
    };
    expect(profileActivityHasItems(data)).toBe(true);
    expect(profileActivityAnchor(data)).toBe("note-1");
    expect(profileActivityHasItems({ ...data, notes: [] })).toBe(false);
  });
});
