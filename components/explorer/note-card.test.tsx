import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteCard } from "@/components/explorer/note-card";

const NOTE = {
  id: "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87",
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  content: "Hello #nostr from Alice",
  kind: 1,
  created_at: 1_700_000_000,
  reply_count: 4,
  repost_count: 2,
  reaction_count: 8,
  zap_count: 1,
  zap_msats: 21_000,
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

  it("links avatar and account name to the author profile page", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} />);
    const profilePath = `/profiles/${NOTE.pubkey}`;
    expect(screen.getByRole("link", { name: "Alice" })).toHaveAttribute("href", profilePath);
    expect(screen.getByRole("link", { name: "View Alice" })).toHaveAttribute("href", profilePath);
  });

  it("always renders complete engagement stats", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} />);
    expect(screen.getByText("Replies")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Reposts")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Reactions")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Zaps")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("(21 sats)")).toBeInTheDocument();
  });

  it("renders zeroed engagement stats when counts are missing", () => {
    const {
      reply_count: _r,
      repost_count: _p,
      reaction_count: _a,
      zap_count: _z,
      zap_msats: _m,
      ...bareNote
    } = NOTE;
    render(<NoteCard note={bareNote} author={AUTHOR} />);
    expect(screen.getByText("Replies")).toBeInTheDocument();
    expect(screen.getByText("Reposts")).toBeInTheDocument();
    expect(screen.getByText("Reactions")).toBeInTheDocument();
    expect(screen.getByText("Zaps")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(4);
    expect(screen.queryByText(/sats/)).not.toBeInTheDocument();
  });
});
