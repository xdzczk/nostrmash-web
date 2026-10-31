import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
}));

// jsdom has no ResizeObserver; TabOverflow uses it to track clipped edges.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

import { ProfileActivityTabBar } from "@/components/profile/profile-activity-tab-bar";

const items = [
  { key: "notes", label: "Recent notes", href: "/profiles/x?activity=notes", active: true },
  { key: "replies", label: "Recent replies", href: "/profiles/x?activity=replies", active: false },
];
const overflow = {
  label: "More",
  items: [
    {
      key: "highlights",
      label: "Highlights",
      href: "/profiles/x?activity=highlights",
      active: false,
    },
  ],
};

describe("ProfileActivityTabBar", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("renders the server panel and marks the active tab", () => {
    render(
      <ProfileActivityTabBar items={items} overflow={overflow} activeKey="notes">
        <p>Notes panel</p>
      </ProfileActivityTabBar>
    );
    expect(screen.getByText("Notes panel")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Recent notes" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Recent notes" })).toHaveAttribute(
      "data-prefetch",
      "off"
    );
    expect(screen.getByRole("link", { name: "Recent replies" })).not.toHaveAttribute(
      "aria-current"
    );
    expect(screen.getByRole("link", { name: "Recent replies" })).toHaveAttribute(
      "data-prefetch",
      "full"
    );
    expect(document.querySelector('a[href="/profiles/x?activity=highlights"]')).toHaveAttribute(
      "data-prefetch",
      "full"
    );
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("navigates with replace + scroll:false and keeps the panel mounted", async () => {
    render(
      <ProfileActivityTabBar items={items} overflow={overflow} activeKey="notes">
        <p>Notes panel</p>
      </ProfileActivityTabBar>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Recent replies" }));
    });

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/profiles/x?activity=replies", { scroll: false });
    // With a synchronous mock router the transition settles immediately, so the
    // server panel is back; the optimistic highlight + skeleton while pending is
    // covered by e2e (tab switch keeps scroll, shows skeleton).
    expect(screen.getByText("Notes panel")).toBeInTheDocument();
  });

  it("lets modifier clicks fall through to the browser", async () => {
    render(
      <ProfileActivityTabBar items={items} activeKey="notes">
        <p>Notes panel</p>
      </ProfileActivityTabBar>
    );
    // jsdom cannot navigate; stop the default so the fall-through does not log.
    const stopNavigation = (event: Event) => event.preventDefault();
    document.addEventListener("click", stopNavigation);

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Recent replies" }), { metaKey: true });
    });
    document.removeEventListener("click", stopNavigation);

    expect(replace).not.toHaveBeenCalled();
  });

  it("ignores clicks on the already-active tab", async () => {
    render(
      <ProfileActivityTabBar items={items} activeKey="notes">
        <p>Notes panel</p>
      </ProfileActivityTabBar>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Recent notes" }));
    });

    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the active secondary tab as the overflow trigger label", () => {
    render(
      <ProfileActivityTabBar
        items={items.map((item) => ({ ...item, active: false }))}
        overflow={{
          ...overflow,
          items: overflow.items.map((item) => ({ ...item, active: true })),
        }}
        activeKey="highlights"
      >
        <p>Highlights panel</p>
      </ProfileActivityTabBar>
    );

    const trigger = document.querySelector('[data-testid="tab-overflow-menu"] summary');
    expect(trigger?.textContent).toContain("Highlights");
    expect(trigger).toHaveAttribute("aria-current", "page");
  });
});
