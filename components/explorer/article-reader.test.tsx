import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ArticleReader } from "@/components/explorer/article-reader";
import { hexToNpub } from "@/lib/nostr/nip19";
import { LONG_FORM_KIND } from "@/lib/types/api";

const PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const NPUB = hexToNpub(PUBKEY)!;

describe("ArticleReader", () => {
  it("renders the full markdown body without clamping", () => {
    render(
      <ArticleReader
        article={{
          id: "a".repeat(64),
          kind: LONG_FORM_KIND,
          pubkey: PUBKEY,
          content: [
            "# Opening",
            "",
            "First paragraph of the article.",
            "",
            "Second paragraph stays visible.",
            "",
            "Closing line that would be clipped by a card summary.",
            "",
            `[Mention](nostr:${NPUB})`,
            "",
            "See [example](https://example.com/long-form) for more.",
          ].join("\n"),
          tags: [
            ["title", "Why long-form matters"],
            ["summary", "A dek"],
            ["t", "essays"],
          ],
        }}
        author={{ pubkey: PUBKEY, display_name: "Alice" }}
      />
    );

    expect(screen.getByRole("heading", { name: "Why long-form matters" })).toBeInTheDocument();
    expect(screen.getByText("First paragraph of the article.")).toBeInTheDocument();
    expect(
      screen.getByText("Closing line that would be clipped by a card summary.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "example" })).toHaveAttribute(
      "href",
      "https://example.com/long-form"
    );
    expect(screen.getByRole("link", { name: "Mention" })).toHaveAttribute(
      "href",
      `/profiles/${encodeURIComponent(NPUB)}`
    );
    expect(screen.queryByText(/line-clamp/)).not.toBeInTheDocument();
  });

  it("does not turn javascript hrefs into links", () => {
    render(
      <ArticleReader
        article={{
          id: "b".repeat(64),
          kind: LONG_FORM_KIND,
          content: "Click [here](javascript:alert(1)) please.",
          tags: [["title", "Unsafe"]],
        }}
      />
    );
    expect(screen.queryByRole("link", { name: "here" })).not.toBeInTheDocument();
    expect(screen.getAllByText(/please/).length).toBeGreaterThan(0);
  });
});
