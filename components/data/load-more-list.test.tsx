import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoadMoreList } from "@/components/data/load-more-list";

describe("LoadMoreList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the next page when it scrolls into view", async () => {
    class ImmediateObserver {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe() {
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", ImmediateObserver);

    const loadMore = vi.fn(async () => ({
      content: <p>page two</p>,
    }));

    render(
      <LoadMoreList auto initialCursor="cursor-2" loadMore={loadMore} label="Load more notes" />
    );

    await waitFor(() => expect(loadMore).toHaveBeenCalledWith("cursor-2"));
    expect(await screen.findByText("page two")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more notes" })).not.toBeInTheDocument();
  });
});
