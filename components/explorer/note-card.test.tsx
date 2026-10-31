import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteCard } from "@/components/explorer/note-card";
import { encodeNprofile, hexToNpub } from "@/lib/nostr/nip19";

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

  it("opens the note page from the card body on list cards", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} />);
    expect(screen.getByRole("link", { name: "Open note by Alice" })).toHaveAttribute(
      "href",
      `/notes/${NOTE.id}`
    );
  });

  it("does not overlay a card link on the full reading surface", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} showFullContent />);
    expect(screen.queryByRole("link", { name: "Open note by Alice" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open note" })).toHaveAttribute(
      "href",
      `/notes/${NOTE.id}`
    );
  });

  it("truncates extremely long author display names", () => {
    const longName = "しゆいろ".repeat(12);
    render(<NoteCard note={NOTE} author={{ ...AUTHOR, display_name: longName }} />);
    const nameLink = screen.getByTitle(longName);
    expect(nameLink).toHaveAttribute("href", `/profiles/${NOTE.pubkey}`);
    expect(nameLink.textContent).toMatch(/…$/);
    expect(nameLink.textContent?.length).toBeLessThan(longName.length);
  });

  it("strips emoji shortcodes from the author name", () => {
    render(
      <NoteCard
        note={NOTE}
        author={{ ...AUTHOR, display_name: ":israel_burn:しゆいろ:petthex_javasparrow:(本物)" }}
      />
    );
    expect(screen.getByTitle("しゆいろ(本物)")).toBeInTheDocument();
  });

  it("uses the card as the link and keeps thread actions off the list row", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} />);
    expect(screen.queryByRole("link", { name: "Inspect thread" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Seen on relays" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open note" })).not.toBeInTheDocument();
  });

  it("links the top zap to the zapper", () => {
    const sender = "c".repeat(64);
    render(
      <NoteCard
        note={{
          ...NOTE,
          top_zap: {
            sats: 21000,
            sender_pubkey: sender,
            display_name: "Bob",
            comment: "welcome",
          },
        }}
        author={AUTHOR}
      />
    );
    expect(
      screen.getByRole("link", { name: "Top zap from Bob, 21,000 sats: welcome" })
    ).toHaveAttribute("href", `/profiles/${sender}`);
    expect(screen.getByText("welcome")).toBeInTheDocument();
  });

  it("shows the shared stat row and one thread link on a conversation row", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} conversation />);
    expect(screen.getByRole("group", { name: "4 replies" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "2 reposts" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "8 reactions" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "1 zap, 21 sats" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thread" })).toHaveAttribute(
      "href",
      `/notes/${NOTE.id}#conversation-context`
    );
  });

  it("links avatar and account name to the author profile page", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} />);
    const profilePath = `/profiles/${NOTE.pubkey}`;
    expect(screen.getByRole("link", { name: "Alice" })).toHaveAttribute("href", profilePath);
    expect(screen.getByRole("link", { name: "View Alice" })).toHaveAttribute("href", profilePath);
  });

  it("renders full identifier-heavy content on the detail surface", () => {
    const npub = "npub1" + "q".repeat(58);
    const longNote = {
      ...NOTE,
      content: `start ${npub} ${npub} ${"hex".repeat(40)} end-of-note`,
    };
    render(<NoteCard note={longNote} author={AUTHOR} showFullContent />);
    expect(screen.getByText(/end-of-note/)).toBeInTheDocument();
  });

  it("renders the complete body and inline urls when showFullContent is set", () => {
    const longNote = {
      ...NOTE,
      content: [
        "Line one of a long note",
        "Line two of a long note",
        "Line three of a long note",
        "Line four of a long note",
        "Line five with https://example.com/full-article",
      ].join("\n"),
    };
    const { container } = render(<NoteCard note={longNote} author={AUTHOR} showFullContent />);
    expect(screen.getByText(/Line five with/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /example\.com\/full-article/ })).toBeInTheDocument();
    expect(container.querySelector(".line-clamp-2, .line-clamp-4")).toBeNull();
  });

  it("resolves a long nprofile mention on list cards without clamping the bech32 first", () => {
    const nprofile = encodeNprofile({
      pubkey: NOTE.pubkey,
      relays: [
        "wss://relay.damus.io",
        "wss://nos.lol",
        "wss://relay.primal.net",
        "wss://relay.snort.social",
      ],
    })!;
    expect(nprofile.length).toBeGreaterThanOrEqual(128);
    render(
      <NoteCard
        note={{ ...NOTE, content: `Cool to see nostr:${nprofile}` }}
        author={AUTHOR}
        contentResolution={{
          profilesByPubkey: {
            [NOTE.pubkey]: { pubkey: NOTE.pubkey, display_name: "Zapstore" },
          },
        }}
      />
    );
    expect(screen.getByRole("link", { name: "@Zapstore" })).toHaveAttribute(
      "href",
      `/profiles/${encodeURIComponent(hexToNpub(NOTE.pubkey)!)}`
    );
    expect(screen.queryByText(/nprofile1/)).not.toBeInTheDocument();
  });

  it("resolves NIP-08 and bare @handles against hydrated profiles", () => {
    render(
      <NoteCard
        note={{
          ...NOTE,
          content: "The next version of @Zapstore will be insane. Thanks #[0].",
          tags: [["p", NOTE.pubkey]],
        }}
        author={AUTHOR}
        contentResolution={{
          profilesByPubkey: {
            [NOTE.pubkey]: { pubkey: NOTE.pubkey, display_name: "Zapstore" },
          },
        }}
      />
    );
    expect(screen.getAllByRole("link", { name: "@Zapstore" })).toHaveLength(2);
    expect(screen.queryByText(/#\[0\]/)).not.toBeInTheDocument();
  });

  it("always renders complete engagement stats", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} />);
    expect(screen.getByRole("group", { name: "4 replies" })).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "2 reposts" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "8 reactions" })).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "1 zap, 21 sats" })).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("21 sats")).toBeInTheDocument();
  });

  it("keeps zero engagement visible on the note page", () => {
    render(
      <NoteCard
        note={{
          ...NOTE,
          reply_count: 0,
          repost_count: 0,
          reaction_count: 1,
          zap_count: 0,
          zap_msats: 0,
        }}
        author={AUTHOR}
        density="detail"
      />
    );
    expect(screen.getByRole("group", { name: "0 replies" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "0 reposts" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "1 reaction" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "0 zaps" })).toBeInTheDocument();
  });

  it("includes quote posts in the repost count", () => {
    render(<NoteCard note={{ ...NOTE, quote_count: 3 }} author={AUTHOR} />);
    expect(
      screen.getByRole("group", { name: "5 reposts, including 3 quote posts" })
    ).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("opens a reply from the card body", () => {
    render(<NoteCard note={NOTE} author={AUTHOR} density="reply" />);
    expect(screen.getByRole("link", { name: "Open reply by Alice" })).toHaveAttribute(
      "href",
      `/notes/${NOTE.id}`
    );
  });

  it("draws a thread stem beside the note text", () => {
    const { container } = render(
      <NoteCard note={NOTE} author={AUTHOR} density="reply" connectBelow bridgeToNote />
    );
    const stem = container.querySelector('[data-thread-stem="below"]');
    const text = screen.getByText(/Hello/);
    expect(stem).toBeTruthy();
    expect(stem?.contains(text)).toBe(false);
    const gutter = stem?.nextElementSibling;
    expect(gutter).toHaveClass("pl-14");
    expect(gutter?.contains(text)).toBe(true);
  });

  it("leaves an ordinary reply off the thread line", () => {
    const { container } = render(<NoteCard note={NOTE} author={AUTHOR} density="reply" />);
    expect(container.querySelector("[data-thread-stem]")).toBeNull();
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
    expect(screen.getByRole("group", { name: "0 replies" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "0 reposts" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "0 reactions" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "0 zaps" })).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(4);
    expect(screen.queryByText(/sats/)).not.toBeInTheDocument();
  });
});

describe("NoteCard reposts", () => {
  const REPOST = {
    id: "00640a99a88846a44d8db324f28d0fbd137f6ca23158a5af0d0bbf9810569fea",
    pubkey: "8245d2287fda971e7f360512ab11b5c5a96baf5c28cdcff4da6bb347d27a1481",
    kind: 6,
    created_at: 1_700_000_100,
    content: JSON.stringify(NOTE),
    tags: [
      ["e", NOTE.id],
      ["p", NOTE.pubkey],
    ],
  };
  const REPOSTER = { pubkey: REPOST.pubkey, display_name: "Marco", npub: "npub1marco" };

  it("renders the reposter header and the embedded original instead of raw JSON", () => {
    render(<NoteCard note={REPOST} author={REPOSTER} density="reply" />);
    expect(screen.getByRole("article", { name: "Repost by Marco" })).toBeInTheDocument();
    expect(screen.getByText("reposted")).toBeInTheDocument();
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    expect(screen.queryByText(/"kind":/)).not.toBeInTheDocument();
  });

  it("collapses reposts of the page's own note to a one-line attribution", () => {
    render(<NoteCard note={REPOST} author={REPOSTER} density="reply" contextEventId={NOTE.id} />);
    expect(screen.getByText("reposted this note")).toBeInTheDocument();
    expect(screen.queryByText(/Hello/)).not.toBeInTheDocument();
  });
});
