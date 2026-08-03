import { beforeEach, describe, expect, it, vi } from "vitest";

import { lookupNoteWithEngagement, withSearchEngagementCounts } from "./engagement";

vi.mock("@/lib/api/endpoints/notes", () => ({
  getEventCounts: vi.fn(),
  getNoteSummary: vi.fn(),
}));

import { getEventCounts, getNoteSummary } from "@/lib/api/endpoints/notes";

const mocked = {
  getEventCounts: vi.mocked(getEventCounts),
  getNoteSummary: vi.mocked(getNoteSummary),
};

describe("withSearchEngagementCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips count fetches when notes already include engagement fields", async () => {
    const notes = [{ id: "a".repeat(64), reply_count: 3, reaction_count: 1 }];
    const out = await withSearchEngagementCounts(notes, "requestTime");
    expect(out).toEqual(notes);
    expect(mocked.getEventCounts).not.toHaveBeenCalled();
  });

  it("hydrates missing engagement fields from /counts", async () => {
    mocked.getEventCounts.mockResolvedValue({
      reply_count: 4,
      reaction_count: 2,
      repost_count: 1,
      zap_count: 0,
      counts: { reply_count: 4, reaction_count: 2, repost_count: 1, zap_count: 0 },
    });
    const note = { id: "b".repeat(64), content: "hello" };
    const out = await withSearchEngagementCounts([note], "shortTtl");
    expect(mocked.getEventCounts).toHaveBeenCalledWith(note.id, "shortTtl");
    expect(out[0]?.reply_count).toBe(4);
    expect(out[0]?.reaction_count).toBe(2);
  });
});

describe("lookupNoteWithEngagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns note summary with applied engagement counts", async () => {
    const id = "c".repeat(64);
    mocked.getNoteSummary.mockResolvedValue({
      note: { id, content: "lookup" },
      counts: { reply_count: 9, reaction_count: 5, repost_count: 2, zap_count: 1 },
      summary: { reply_count: 9 },
    });
    const note = await lookupNoteWithEngagement(id, "shortTtl");
    expect(note?.id).toBe(id);
    expect(note?.reply_count).toBe(9);
    expect(note?.reaction_count).toBe(5);
  });
});
