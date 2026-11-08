import { describe, expect, it } from "vitest";

import {
  PROFILE_ACTIVITY_GROUPS,
  PROFILE_ACTIVITY_TABS,
  profileActivityGroup,
} from "@/lib/profile/activity-tabs";

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

  it("groups posts, engagement, curation, and safety without moving moderation into insights", () => {
    expect(profileActivityGroup("notes").label).toBe("Posts");
    expect(profileActivityGroup("highlights").label).toBe("Engagement");
    expect(profileActivityGroup("lists").label).toBe("Curation");
    expect(profileActivityGroup("moderation").label).toBe("Safety");
    expect(PROFILE_ACTIVITY_GROUPS.flatMap((group) => group.tabs)).not.toContain("graph");
  });
});
