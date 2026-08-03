import { describe, expect, it } from "vitest";

import { normalizeHotConversationNotes } from "@/lib/api/endpoints/shared";

describe("normalizeHotConversationNotes", () => {
  const rootId = "1b".repeat(32);

  it("lifts conversation engagement fields onto normalized notes", () => {
    const notes = normalizeHotConversationNotes([
      {
        root_event_id: rootId,
        author_pubkey: "pk_author",
        content: "hot thread root",
        reply_count: 42,
        repost_count: 7,
        reaction_count: 15,
        zap_count: 3,
        zap_msats: 21000,
        participant_count: 12,
        velocity_score: 42.5,
      },
    ]);

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      id: rootId,
      pubkey: "pk_author",
      content: "hot thread root",
      reply_count: 42,
      repost_count: 7,
      reaction_count: 15,
      zap_count: 3,
      zap_msats: 21000,
    });
  });

  it("keeps conversation-level engagement when nested note omits counts", () => {
    const notes = normalizeHotConversationNotes([
      {
        root_event_id: rootId,
        reply_count: 10,
        repost_count: 2,
        reaction_count: 4,
        zap_count: 1,
        note: {
          id: rootId,
          pubkey: "pk_nested",
          content: "nested note body",
        },
      },
    ]);

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      id: rootId,
      pubkey: "pk_nested",
      reply_count: 10,
      repost_count: 2,
      reaction_count: 4,
      zap_count: 1,
    });
  });
});
