import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DiscoverShell } from "@/components/discover/discover-shell";
import { TabBar } from "@/components/ui/tabs";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

describe("Discover category and mode prefetch", () => {
  it("warms the other categories and the modes of the page you are on", () => {
    render(
      <DiscoverShell
        view="media"
        mode="pictures"
        title="Pictures"
        subtitle="Pictures leading the network."
        path="/trending/pictures"
        searchParams={new URLSearchParams("window=7d&lang=ja")}
        window="7d"
        language="ja"
      >
        <p>Pictures</p>
      </DiscoverShell>
    );

    const categories = within(screen.getByRole("navigation", { name: "Discover categories" }));
    expect(categories.getByRole("link", { name: "Media" })).toHaveAttribute("data-prefetch", "off");
    expect(categories.getByRole("link", { name: "Notes" })).toHaveAttribute(
      "href",
      "/trending/notes?window=7d&lang=ja"
    );
    expect(categories.getByRole("link", { name: "Notes" })).toHaveAttribute(
      "data-prefetch",
      "full"
    );
    expect(categories.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/?window=7d&lang=ja"
    );

    const modes = within(screen.getByRole("navigation", { name: "media modes" }));
    expect(modes.getByRole("link", { name: "Pictures" })).toHaveAttribute("data-prefetch", "off");
    expect(modes.getByRole("link", { name: "Videos" })).toHaveAttribute(
      "href",
      "/trending/videos?window=7d&lang=ja"
    );
    expect(modes.getByRole("link", { name: "Videos" })).toHaveAttribute("data-prefetch", "full");
    expect(modes.getByRole("link", { name: "Live" })).toHaveAttribute("href", "/live");
    expect(modes.getByRole("link", { name: "Live" })).toHaveAttribute("data-prefetch", "full");
  });

  it("leaves other tab bars on the default prefetch", () => {
    render(
      <TabBar
        ariaLabel="Result kinds"
        items={[
          { key: "all", label: "All", href: "/search?q=nostr", active: true },
          { key: "notes", label: "Notes", href: "/search?q=nostr&tab=notes", active: false },
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "Notes" })).not.toHaveAttribute("data-prefetch");
    expect(screen.getByRole("link", { name: "All" })).not.toHaveAttribute("data-prefetch");
  });
});
