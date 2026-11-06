import { describe, expect, it } from "vitest";

import { PROFILE_ACTIVITY_TABS } from "@/lib/profile/activity-tabs";

describe("PROFILE_ACTIVITY_TABS", () => {
  it("uses short primary labels and keeps the query keys", () => {
    expect(PROFILE_ACTIVITY_TABS.map((tab) => [tab.id, tab.label])).toEqual([
      ["notes", "Notes"],
      ["replies", "Replies"],
      ["reactions", "Reactions"],
      ["zaps", "Zaps sent"],
      ["long_form", "Articles"],
      ["media", "Media"],
      ["highlights", "Highlights"],
      ["bookmarks", "Bookmarks"],
      ["pins", "Pins"],
      ["live", "Live"],
      ["interests", "Interests"],
      ["lists", "Lists"],
      ["labels", "Labels"],
      ["mute_list", "Mute list"],
      ["muted_by", "Muted by"],
      ["graph", "Graph"],
      ["zap_stats", "Zaps"],
      ["moderation", "Moderation"],
      ["identities", "Identities"],
    ]);
  });
});
