import { describe, expect, it } from "vitest";

import { PROFILE_ACTIVITY_TABS } from "@/lib/profile/activity-tabs";

describe("PROFILE_ACTIVITY_TABS", () => {
  it("uses short primary labels and keeps the query keys", () => {
    expect(PROFILE_ACTIVITY_TABS.map((tab) => [tab.id, tab.label, tab.secondary])).toEqual([
      ["notes", "Notes", false],
      ["replies", "Replies", false],
      ["reactions", "Reactions", false],
      ["zaps", "Zaps sent", false],
      ["long_form", "Articles", false],
      ["media", "Media", false],
      ["bookmarks", "Bookmarks", true],
      ["highlights", "Highlights", true],
      ["live", "Live", true],
      ["pins", "Pins", true],
      ["mute_list", "Mute list", true],
      ["muted_by", "Muted by", true],
    ]);
  });
});
