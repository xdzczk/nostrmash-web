import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...(actual as object),
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

vi.mock("@/lib/api/endpoints", () => ({
  getNoteSummary: vi.fn(),
  getThread: vi.fn(),
  getEventAncestors: vi.fn(),
  getEventReplies: vi.fn(),
  getRelatedNotes: vi.fn(),
  getEvent: vi.fn(),
  getEventSeenOn: vi.fn(),
  getEventCounts: vi.fn(),
  getThreadSummary: vi.fn(),
  getThreadActivity: vi.fn(),
}));

vi.mock("@/lib/api/profile-hydration", () => ({
  fetchProfilesByPubkey: vi.fn(async () => ({})),
  listHydratablePubkeys: vi.fn((pubkeys: string[]) => pubkeys),
}));

import {
  getEvent,
  getEventAncestors,
  getEventCounts,
  getEventReplies,
  getEventSeenOn,
  getNoteSummary,
  getRelatedNotes,
  getThread,
  getThreadActivity,
  getThreadSummary,
} from "@/lib/api/endpoints";
import { loadNotePageData } from "@/lib/notes/load-note-page-data";

const mocked = {
  getNoteSummary: vi.mocked(getNoteSummary),
  getThread: vi.mocked(getThread),
  getEventAncestors: vi.mocked(getEventAncestors),
  getEventReplies: vi.mocked(getEventReplies),
  getRelatedNotes: vi.mocked(getRelatedNotes),
  getEvent: vi.mocked(getEvent),
  getEventSeenOn: vi.mocked(getEventSeenOn),
  getEventCounts: vi.mocked(getEventCounts),
  getThreadSummary: vi.mocked(getThreadSummary),
  getThreadActivity: vi.mocked(getThreadActivity),
};

describe("loadNotePageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assembles a happy-path note page from summary and thread payloads", async () => {
    const eventId = "a".repeat(64);
    const note = {
      id: eventId,
      pubkey: "b".repeat(64),
      kind: 1,
      created_at: 1_700_000_000,
      content: "hello from nostr",
    };

    mocked.getNoteSummary.mockResolvedValue({
      note,
      author: { profile: { pubkey: note.pubkey, display_name: "Ada" } },
      counts: { reply_count: 2 },
      provenance: { relays: ["wss://relay.example"] },
    });
    mocked.getThread.mockResolvedValue({
      root: note,
      ancestors: [],
      replies: [{ ...note, id: "c".repeat(64), content: "reply" }],
    });
    mocked.getEventAncestors.mockResolvedValue({ ancestors: [] });
    mocked.getEventReplies.mockResolvedValue({
      replies: [{ ...note, id: "c".repeat(64), content: "reply" }],
      next_cursor: "next-replies",
    });
    mocked.getRelatedNotes.mockResolvedValue({ related: [] });

    const data = await loadNotePageData(eventId, {});

    expect(data.errorMessage).toBe("");
    expect(data.focal?.id).toBe(eventId);
    expect(data.replies).toHaveLength(1);
    expect(data.repliesNextCursor).toBe("next-replies");
    expect(data.resolvedAuthor?.display_name).toBe("Ada");
    expect(mocked.getEvent).not.toHaveBeenCalled();
    expect(mocked.getEventSeenOn).not.toHaveBeenCalled();
    expect(mocked.getEventCounts).not.toHaveBeenCalled();
  });

  it("surfaces a user-facing error when the primary note surfaces fail", async () => {
    mocked.getNoteSummary.mockRejectedValue(new Error("API 500: upstream failed"));
    mocked.getThread.mockRejectedValue(new Error("API 500: upstream failed"));
    mocked.getEventAncestors.mockRejectedValue(new Error("API 500: ancestors failed"));
    mocked.getEventReplies.mockRejectedValue(new Error("API 500: replies failed"));
    mocked.getRelatedNotes.mockResolvedValue({ related: [] });
    mocked.getEvent.mockRejectedValue(new Error("API 500: event failed"));
    mocked.getEventSeenOn.mockRejectedValue(new Error("API 500: seen-on failed"));
    mocked.getEventCounts.mockRejectedValue(new Error("API 500: counts failed"));

    const data = await loadNotePageData("d".repeat(64), {});

    expect(data.focal).toBeUndefined();
    expect(data.errorMessage.length).toBeGreaterThan(0);
  });
});
