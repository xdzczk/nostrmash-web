import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

import { HashtagsList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";

describe("HashtagsList", () => {
  it("drops sub-floor tags and shows sources instead of a second event count", () => {
    render(
      <HashtagsList
        ranked
        searchable
        hashtags={[
          {
            hashtag: "php",
            event_count: 90,
            ranking: { rank: 2, score: 90, source_breadth: 69 },
          },
          { hashtag: "122", count: 1, ranking: { rank: 9, score: 1, source_breadth: 1 } },
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "#php" })).toBeInTheDocument();
    expect(screen.getByText("69")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "#122" })).not.toBeInTheDocument();
    expect(screen.queryByText("90")).not.toBeInTheDocument();
  });
});

describe("RankedListPage", () => {
  const page = {
    discoverView: "links" as const,
    eyebrow: "",
    title: "Links",
    subtitle: "Domains in circulation.",
    path: "/trending/domains",
    searchParams: new URLSearchParams("window=7d"),
    window: "7d" as const,
    semantics: {},
    errorMessage: "",
    emptyTitle: "No ranked domains yet",
    emptyMessage: "Ranked domains have not populated for this window.",
    debugPayload: {},
  };

  it("shows the empty state only after a successful empty response", () => {
    render(
      <RankedListPage {...page} hasItems={false}>
        <p>rows</p>
      </RankedListPage>
    );
    expect(
      screen.getByText("Ranked domains have not populated for this window.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the error panel with a retry and does not claim the list is empty", () => {
    render(
      <RankedListPage {...page} hasItems={false} errorMessage="The request timed out.">
        <p>rows</p>
      </RankedListPage>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("The request timed out.");
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/trending/domains?window=7d"
    );
    expect(
      screen.queryByText("Ranked domains have not populated for this window.")
    ).not.toBeInTheDocument();
  });
});
