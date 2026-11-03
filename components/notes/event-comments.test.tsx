import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThreadView } from "@/components/thread/thread-view";
import {
  loadNoteComments,
  loadNoteThreadData,
  loadThreadActivityStats,
} from "@/lib/notes/load-note-page-data";
import { hexToNote } from "@/lib/nostr/nip19";

import { DeferredNoteThread } from "./deferred-note-sections";

vi.mock("@/app/notes/[eventId]/actions", () => ({
  loadDirectReplies: vi.fn(),
  loadMoreReplies: vi.fn(),
  loadQuotes: vi.fn(),
}));

vi.mock("@/lib/notes/load-note-page-data", () => ({
  loadNoteThreadData: vi.fn(),
  loadThreadActivityStats: vi.fn(),
  loadNoteComments: vi.fn(),
  loadNoteRelatedData: vi.fn(),
  mergeNoteContentResolution: (
    base?: { profilesByPubkey?: object; eventsById?: object },
    extra?: { profilesByPubkey?: object; eventsById?: object }
  ) => ({
    profilesByPubkey: { ...base?.profilesByPubkey, ...extra?.profilesByPubkey },
    eventsById: { ...base?.eventsById, ...extra?.eventsById },
  }),
}));

const AUTHOR = "a".repeat(64);
const QUOTED = "b".repeat(64);
const EVENT_ID = "d".repeat(64);
const COMMENT_ID = "c".repeat(64);
const REPLY_ID = "e".repeat(64);
const NOTE = hexToNote(EVENT_ID)!;

describe("comment thread rendering", () => {
  it("shows a comment in the reply card, including media and post stats", () => {
    const { container } = render(
      <ThreadView
        focalEventId={"f".repeat(64)}
        replies={[
          {
            id: COMMENT_ID,
            pubkey: AUTHOR,
            kind: 1111,
            content: `Look\nhttps://cdn.example/pic.webp\n${NOTE}`,
            created_at: 1_700_000_000,
            reply_count: 3,
            reaction_count: 1,
            repost_count: 0,
            zap_count: 2,
            zap_msats: 21_000,
          },
        ]}
        authorsByPubkey={{
          [AUTHOR]: { pubkey: AUTHOR, display_name: "Moravian" },
        }}
        contentResolution={{
          profilesByPubkey: {
            [AUTHOR]: { pubkey: AUTHOR, display_name: "Moravian" },
            [QUOTED]: { pubkey: QUOTED, display_name: "Cigar" },
          },
          eventsById: {
            [EVENT_ID]: {
              id: EVENT_ID,
              pubkey: QUOTED,
              kind: 1,
              content: "Stash",
              tags: [["imeta", "url https://cdn.example/stash.jpg", "m image/jpeg", "alt Stash"]],
            },
          },
        }}
      />
    );

    expect(screen.getByRole("article", { name: "Reply" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Comments" })).not.toBeInTheDocument();
    expect(screen.getByText("Look")).toBeInTheDocument();
    expect(screen.getByText("Stash")).toBeInTheDocument();
    expect(screen.getByText("Cigar")).toBeInTheDocument();
    expect(screen.getByText("Moravian")).toBeInTheDocument();
    expect(screen.queryByText(/pic\.webp/)).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "3 replies" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "1 reaction" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "2 zaps, 21 sats" })).toBeInTheDocument();
    expect(container.querySelector('img[src="https://cdn.example/pic.webp"]')).toBeTruthy();
    expect(container.querySelector('img[src="https://cdn.example/stash.jpg"]')).toBeTruthy();
  });
});

describe("DeferredNoteThread", () => {
  beforeEach(() => {
    vi.mocked(loadNoteThreadData).mockReset();
    vi.mocked(loadNoteComments).mockReset();
    vi.mocked(loadThreadActivityStats).mockReset();
  });

  it("lists replies and comments under one heading", async () => {
    vi.mocked(loadNoteThreadData).mockResolvedValue({
      ancestors: [],
      authorsByPubkey: { [AUTHOR]: { pubkey: AUTHOR, display_name: "Ada" } },
      contentResolution: { profilesByPubkey: {}, eventsById: {} },
      errorMessage: "",
      missingAncestorIds: [],
      replies: [
        {
          id: REPLY_ID,
          pubkey: AUTHOR,
          kind: 1,
          content: "A reply",
          created_at: 10,
          reply_count: 0,
          reaction_count: 0,
          repost_count: 0,
          zap_count: 0,
        },
      ],
      repliesNextCursor: undefined,
    } as unknown as Awaited<ReturnType<typeof loadNoteThreadData>>);
    vi.mocked(loadThreadActivityStats).mockResolvedValue({
      replies24h: undefined,
      replies7d: undefined,
      participantCount: undefined,
    });
    vi.mocked(loadNoteComments).mockResolvedValue({
      comments: [
        {
          id: COMMENT_ID,
          pubkey: AUTHOR,
          kind: 1111,
          content: "A comment",
          created_at: 20,
          reply_count: 1,
          reaction_count: 0,
          repost_count: 0,
          zap_count: 0,
        },
      ],
      authorsByPubkey: { [AUTHOR]: { pubkey: AUTHOR, display_name: "Ada" } },
      contentResolution: { profilesByPubkey: {}, eventsById: {} },
    });

    const view = await DeferredNoteThread({
      eventId: EVENT_ID,
      rootEventId: EVENT_ID,
      searchParams: {},
      replyCount: 2,
    });
    render(view);

    expect(screen.getByRole("heading", { name: "2 replies" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Comments" })).not.toBeInTheDocument();
    expect(screen.getByText("A reply")).toBeInTheDocument();
    expect(screen.getByText("A comment")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "1 reply" })).toBeInTheDocument();
  });
});
