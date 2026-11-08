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

  it("renders a ranked article from its content and the server reason", () => {
    render(
      <EventKindSwitch
        event={{
          id: ARTICLE_ID,
          pubkey: AUTHOR,
          kind: 30023,
          content:
            "Bookmarked long-form piece about public relays and how readers find them today.",
          bookmark_count: 1,
          ranking: {
            rank: 1,
            score: 1,
            reasons: [
              {
                code: "saved_by",
                evidence: [{ metric: "bookmark_count", value: 1, unit: "people" }],
              },
            ],
          },
        }}
        rank={1}
        discoverySignals
      />
    );

    expect(
      screen.getByRole("heading", { name: /Bookmarked long-form piece about public relays/ })
    ).toBeInTheDocument();
    expect(screen.getByText("Saved by 1 person")).toBeInTheDocument();
  });

  it("renders a comment with the same post stats as a reply", () => {
    render(
      <EventKindSwitch
        surface="reply"
        event={{
          id: "e".repeat(64),
          pubkey: AUTHOR,
          kind: 1111,
          content: "A comment with stats",
          created_at: 1_700_000_000,
          reply_count: 2,
          reaction_count: 0,
          repost_count: 0,
          zap_count: 0,
        }}
      />
    );
    expect(screen.getByText("A comment with stats")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "2 replies" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "0 reactions" })).toBeInTheDocument();
  });

  it("keeps comments out of list feeds", () => {
    const { container } = render(
      <EventKindSwitch
        surface="list"
        event={{
          id: "e".repeat(64),
          pubkey: AUTHOR,
          kind: 1111,
          content: "hidden in lists",
        }}
      />
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("hidden in lists")).not.toBeInTheDocument();
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
