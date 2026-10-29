import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EventKindSwitch } from "@/components/explorer/event-kind-switch";

const AUTHOR = "b".repeat(64);
const ARTICLE_ID = "c".repeat(64);

describe("EventKindSwitch", () => {
  it("unwraps a kind 16 repost into the article card", () => {
    render(
      <EventKindSwitch
        event={{
          id: "d".repeat(64),
          pubkey: AUTHOR,
          kind: 16,
          created_at: 1_700_000_630,
          content: JSON.stringify({
            id: ARTICLE_ID,
            pubkey: AUTHOR,
            kind: 30023,
            created_at: 1_700_000_620,
            content: "Body of the reposted article.",
            tags: [
              ["title", "Reposted article title"],
              ["d", "reposted-article"],
            ],
          }),
          tags: [
            ["a", `30023:${AUTHOR}:reposted-article`],
            ["e", ARTICLE_ID],
          ],
        }}
      />
    );

    expect(screen.getByText("Reposted article title")).toBeInTheDocument();
    expect(screen.queryByText(/"kind":30023/)).not.toBeInTheDocument();
    expect(screen.getByText("reposted")).toBeInTheDocument();
  });

  it("does not render a report as a note", () => {
    const { container } = render(
      <EventKindSwitch
        event={{
          id: "e".repeat(64),
          pubkey: AUTHOR,
          kind: 1984,
          content: "classified-report-reason-should-stay-hidden",
          tags: [["e", "a".repeat(64), "spam"]],
        }}
      />
    );
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByText("classified-report-reason-should-stay-hidden")
    ).not.toBeInTheDocument();
  });
});
