import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getEventComments } from "@/lib/api/endpoints";
import { fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { hexToNote } from "@/lib/nostr/nip19";
import { resolveContentReferences } from "@/lib/notes/resolve-content-refs";

import { EventComments } from "./event-comments";

vi.mock("@/lib/api/endpoints", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as object), getEventComments: vi.fn() };
});

vi.mock("@/lib/api/profile-hydration", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as object), fetchProfilesByPubkey: vi.fn() };
});

vi.mock("@/lib/notes/resolve-content-refs", () => ({
  resolveContentReferences: vi.fn(),
}));

const AUTHOR = "a".repeat(64);
const QUOTED = "b".repeat(64);
const EVENT_ID = "d".repeat(64);
const COMMENT_ID = "c".repeat(64);
const NOTE = hexToNote(EVENT_ID)!;

describe("EventComments", () => {
  beforeEach(() => {
    vi.mocked(getEventComments).mockReset();
    vi.mocked(fetchProfilesByPubkey).mockReset();
    vi.mocked(resolveContentReferences).mockReset();
  });

  it("renders media links and the image inside a quoted note", async () => {
    vi.mocked(getEventComments).mockResolvedValue({
      comments: [
        {
          id: COMMENT_ID,
          pubkey: AUTHOR,
          kind: 1111,
          content: `Look\nhttps://cdn.example/pic.webp\n${NOTE}`,
          created_at: 1_700_000_000,
        },
      ],
    });
    vi.mocked(resolveContentReferences).mockResolvedValue({
      profilesByPubkey: {},
      eventsById: {
        [EVENT_ID]: {
          id: EVENT_ID,
          pubkey: QUOTED,
          kind: 1,
          content: "Stash",
          tags: [["imeta", "url https://cdn.example/stash.jpg", "m image/jpeg", "alt Stash"]],
        },
      },
    });
    vi.mocked(fetchProfilesByPubkey).mockImplementation(async (pubkeys) => {
      const profiles: Record<string, { pubkey: string; display_name: string }> = {};
      for (const pubkey of pubkeys) {
        if (typeof pubkey !== "string") continue;
        const key = pubkey.toLowerCase();
        if (key === AUTHOR) profiles[key] = { pubkey: AUTHOR, display_name: "Moravian" };
        if (key === QUOTED) profiles[key] = { pubkey: QUOTED, display_name: "Cigar" };
      }
      return profiles;
    });

    const view = await EventComments({ eventId: "e".repeat(64) });
    const { container } = render(view);

    expect(screen.getByRole("article", { name: "Comment by Moravian" })).toBeInTheDocument();
    expect(screen.getByText("Look")).toBeInTheDocument();
    expect(screen.getByText("Stash")).toBeInTheDocument();
    expect(screen.getByText("Cigar")).toBeInTheDocument();
    expect(screen.queryByText(/pic\.webp/)).not.toBeInTheDocument();
    expect(container.querySelector('img[src="https://cdn.example/pic.webp"]')).toBeTruthy();
    expect(container.querySelector('img[src="https://cdn.example/stash.jpg"]')).toBeTruthy();
  });
});
