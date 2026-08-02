import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteContent } from "@/components/explorer/note-content";
import { hexToNpub, hexToNote } from "@/lib/nostr/nip19";
import { tokenizeNoteContent } from "@/lib/notes/tokenize";

const PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const EVENT_ID = "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87";
const NPUB = hexToNpub(PUBKEY)!;
const NOTE = hexToNote(EVENT_ID)!;
const NSEC = "nsec1enxvenxvenxvenxvenxvenxvenxvenxvenxvenxvenxvenxvenxqlu2hdh";

describe("NoteContent", () => {
  it("linkifies https urls, hashtags, and mentions", () => {
    const tokens = tokenizeNoteContent(`Hello https://example.com #nostr ${NPUB}`);
    render(<NoteContent tokens={tokens} />);

    expect(screen.getByRole("link", { name: "https://example.com" })).toHaveAttribute(
      "href",
      "https://example.com/"
    );
    expect(screen.getByRole("link", { name: "#nostr" })).toHaveAttribute("href", "/hashtags/nostr");
    expect(screen.getByRole("link", { name: /@/ })).toHaveAttribute(
      "href",
      `/profiles/${encodeURIComponent(NPUB)}`
    );
  });

  it("renders resolved mention display name and quote card", () => {
    const tokens = tokenizeNoteContent(`see ${NOTE}`);
    render(
      <NoteContent
        tokens={tokens}
        resolution={{
          eventsById: {
            [EVENT_ID]: {
              id: EVENT_ID,
              pubkey: PUBKEY,
              content: "Quoted body",
              kind: 1,
            },
          },
          profilesByPubkey: {
            [PUBKEY]: { pubkey: PUBKEY, display_name: "Alice", npub: NPUB },
          },
        }}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Quoted body")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /note1/ })).toHaveAttribute(
      "href",
      `/notes/${encodeURIComponent(EVENT_ID)}`
    );
  });

  it("redacts nsec secrets", () => {
    const tokens = tokenizeNoteContent(`secret ${NSEC}`);
    render(<NoteContent tokens={tokens} />);
    expect(screen.getByText("[redacted nsec]")).toBeInTheDocument();
    expect(screen.queryByText(NSEC)).not.toBeInTheDocument();
  });

  it("does not render javascript: urls as links", () => {
    const tokens = [
      { type: "url" as const, value: "javascript:alert(1)", href: "javascript:alert(1)" },
      { type: "text" as const, value: " ok" },
    ];
    render(<NoteContent tokens={tokens} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
  });

  it("hides media file urls from rendered note text", () => {
    const tokens = tokenizeNoteContent(
      `Hello https://cdn.example/photo.jpg and https://example.com/page`
    );
    render(<NoteContent tokens={tokens} />);

    expect(screen.queryByText(/photo\.jpg/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://example.com/page" })).toHaveAttribute(
      "href",
      "https://example.com/page"
    );
  });

  it("hides urls that are rendered as link preview cards", () => {
    const tokens = tokenizeNoteContent(`Hello https://example.com/page and https://other.example`);
    render(<NoteContent tokens={tokens} hideLinkPreviewUrls={["https://example.com/page"]} />);

    expect(
      screen.queryByRole("link", { name: "https://example.com/page" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://other.example" })).toBeInTheDocument();
  });
});
