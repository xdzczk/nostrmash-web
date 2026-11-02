import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NetworkNav } from "@/components/explorer/network-nav";
import { SiteNav } from "@/components/layout/site-nav";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

describe("Network prefetch", () => {
  it("warms the other network categories", () => {
    render(<NetworkNav active="overview" />);

    const categories = screen.getByRole("navigation", { name: "Network categories" });
    expect(categories).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("data-prefetch", "off");
    expect(screen.getByRole("link", { name: "Popular relays" })).toHaveAttribute(
      "href",
      "/relays/popular"
    );
    expect(screen.getByRole("link", { name: "Popular relays" })).toHaveAttribute(
      "data-prefetch",
      "full"
    );
    expect(screen.getByRole("link", { name: "Status" })).toHaveAttribute("href", "/relays/health");
    expect(screen.getByRole("link", { name: "Statistics" })).toHaveAttribute("href", "/stats");
    expect(screen.getByRole("link", { name: "Statistics" })).toHaveAttribute(
      "data-prefetch",
      "full"
    );
  });

  it("warms Network from Discover and leaves the current section alone", () => {
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute("data-prefetch", "off");
    expect(screen.getByRole("link", { name: "Network" })).toHaveAttribute("href", "/relays");
    expect(screen.getByRole("link", { name: "Network" })).toHaveAttribute("data-prefetch", "full");
  });
});
