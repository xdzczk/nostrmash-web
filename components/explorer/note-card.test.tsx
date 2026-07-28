import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteCard } from "@/components/explorer/note-card";

const NOTE = {
  id: "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87",
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  content: "Hello #nostr from Alice",
  kind: 1,
  created_at: 1_700_000_000,
};

const AUTHOR = {
  pubkey: NOTE.pubkey,
  display_name: "Alice",
  name: "alice",
  npub: "npub1test",
};

describe("NoteCard", () => {
  it("renders author and linkified hashtag when showFullContent is set", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} showFullContent />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    const hashtagLinks = screen.getAllByRole("link", { name: "#nostr" });
    expect(hashtagLinks.length).toBeGreaterThan(0);
    expect(hashtagLinks[0]).toHaveAttribute("href", "/hashtags/nostr");
  });

  it("links to the note detail page", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} />);
    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href")?.includes(`/notes/${NOTE.id}`))).toBe(
      true
    );
  });
});
