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

  it("carries window and language independently on the new rankings", () => {
    render(
      <DiscoverShell
        view="notes"
        mode="zapped"
        title="Most zapped"
        subtitle="Sats in this window."
        path="/discovery/notes/zapped"
        searchParams={new URLSearchParams("window=7d&lang=ja")}
        window="7d"
        language="ja"
      >
        <p>Notes</p>
      </DiscoverShell>
    );

    const notes = within(screen.getByRole("navigation", { name: "notes modes" }));
    expect(notes.getByRole("link", { name: "Most zapped" })).toHaveAttribute(
      "href",
      "/discovery/notes/zapped?window=7d&lang=ja"
    );
    expect(notes.getByRole("link", { name: "Conversations" })).toHaveAttribute(
      "href",
      "/discovery/conversations/hot?window=7d&lang=ja"
    );
    expect(notes.getByRole("link", { name: "Most bookmarked" })).toHaveAttribute(
      "href",
      "/discovery/notes/bookmarked?lang=ja"
    );
    expect(screen.getByRole("group", { name: "Ranking window" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("drops window, language, or both when a ranking says so", () => {
    const { rerender } = render(
      <DiscoverShell
        view="notes"
        mode="bookmarked"
        title="Most bookmarked"
        subtitle="Saved now."
        path="/discovery/notes/bookmarked"
        searchParams={new URLSearchParams("lang=ja")}
        window="24h"
        language="ja"
        showWindowControl={false}
        linkedWindow={null}
      >
        <p>Saved</p>
      </DiscoverShell>
    );

    expect(screen.queryByRole("group", { name: "Ranking window" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    const bookmarked = within(screen.getByRole("navigation", { name: "notes modes" }));
    expect(bookmarked.getByRole("link", { name: "Most zapped" })).toHaveAttribute(
      "href",
      "/discovery/notes/zapped?lang=ja"
    );
    expect(bookmarked.getByRole("link", { name: "Most bookmarked" })).toHaveAttribute(
      "href",
      "/discovery/notes/bookmarked?lang=ja"
    );

    rerender(
      <DiscoverShell
        view="people"
        mode="followed"
        title="Most followed"
        subtitle="Follower directory."
        path="/discovery/profiles/followed"
        searchParams={new URLSearchParams()}
        window="24h"
        showWindowControl={false}
        showLanguageControl={false}
        linkedWindow={null}
      >
        <p>People</p>
      </DiscoverShell>
    );

    expect(screen.queryByRole("group", { name: "Ranking window" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    const followed = within(screen.getByRole("navigation", { name: "people modes" }));
    expect(followed.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Trending",
      "Up and coming",
      "Most supported",
      "Most followed",
    ]);
    expect(followed.getByRole("link", { name: "Most followed" })).toHaveAttribute(
      "href",
      "/discovery/profiles/followed"
    );
    expect(followed.getByRole("link", { name: "Most supported" })).toHaveAttribute(
      "href",
      "/discovery/profiles/supported"
    );
    expect(followed.getByRole("link", { name: "Up and coming" })).toHaveAttribute(
      "href",
      "/discovery/profiles/rising"
    );

    rerender(
      <DiscoverShell
        view="people"
        mode="supported"
        title="Most supported"
        subtitle="Capped sats."
        path="/discovery/profiles/supported"
        searchParams={new URLSearchParams("window=30d")}
        window="30d"
        showLanguageControl={false}
        defaultWindow="30d"
      >
        <p>Supported</p>
      </DiscoverShell>
    );

    expect(screen.getByRole("group", { name: "Ranking window" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    const supported = within(screen.getByRole("navigation", { name: "people modes" }));
    expect(supported.getByRole("link", { name: "Most supported" })).toHaveAttribute(
      "href",
      "/discovery/profiles/supported?window=30d"
    );
    expect(supported.getByRole("link", { name: "Most followed" })).toHaveAttribute(
      "href",
      "/discovery/profiles/followed"
    );
    expect(supported.getByRole("link", { name: "Trending" })).toHaveAttribute(
      "href",
      "/trending/profiles?window=30d"
    );
  });

  it("leaves other tab bars unprefetched unless they opt in", () => {
    render(
      <TabBar
        ariaLabel="Result kinds"
        items={[
          { key: "all", label: "All", href: "/search?q=nostr", active: true },
          { key: "notes", label: "Notes", href: "/search?q=nostr&tab=notes", active: false },
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "Notes" })).toHaveAttribute("data-prefetch", "off");
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("data-prefetch", "off");
  });
});
