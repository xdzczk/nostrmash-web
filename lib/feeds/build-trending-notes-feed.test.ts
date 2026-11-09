import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/endpoints", () => ({
  getTrendingNotes: vi.fn(async () => ({ notes: [] })),
}));

import { getTrendingNotes } from "@/lib/api/endpoints";
import { buildTrendingNotesFeedXml } from "@/lib/feeds/build-trending-notes-feed";

describe("buildTrendingNotesFeedXml", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requests the global ranking and does not send a viewer", async () => {
    await buildTrendingNotesFeedXml("7d");
    expect(getTrendingNotes).toHaveBeenCalledWith("shortTtl", { window: "7d", limit: 50 });
    expect(vi.mocked(getTrendingNotes).mock.calls[0]?.[1]).not.toHaveProperty("viewer");
  });
});
