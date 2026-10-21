import { describe, expect, it } from "vitest";

import { activityEmptyCopy, suggestActivityTab } from "@/lib/profile/activity-empty-state";
import { PROFILE_ACTIVITY_TABS } from "@/lib/profile/activity-tabs";

describe("activityEmptyCopy", () => {
  it("has a message for every tab and hints for the less obvious ones", () => {
    for (const tab of PROFILE_ACTIVITY_TABS) {
      expect(activityEmptyCopy(tab.id).message.length).toBeGreaterThan(10);
    }
    expect(activityEmptyCopy("zaps").hint).toMatch(/Lightning/);
    expect(activityEmptyCopy("highlights").hint).toMatch(/passages/i);
    expect(activityEmptyCopy("notes").hint).toBeUndefined();
  });
});

describe("suggestActivityTab", () => {
  it("prefers the tab with the largest counter, never the current one", () => {
    expect(suggestActivityTab("zaps", { note_count: 184, reply_count: 420 })).toBe("replies");
    expect(suggestActivityTab("replies", { note_count: 184, reply_count: 420 })).toBe("notes");
    expect(suggestActivityTab("notes", { note_count: 184, reply_count: 0 })).toBeNull();
  });

  it("falls back to notes when counters are unknown", () => {
    expect(suggestActivityTab("highlights", null)).toBe("notes");
    expect(suggestActivityTab("notes", undefined)).toBeNull();
  });
});
