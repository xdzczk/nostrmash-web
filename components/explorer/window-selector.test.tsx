import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WindowSelector } from "@/components/explorer/window-selector";
import { DISCOVERY_WINDOW_PREFERENCE_COOKIE } from "@/lib/discover/discovery-window-session";

describe("WindowSelector", () => {
  it("writes the Discover choice before leaving the page", () => {
    const writes: string[] = [];
    const cookie = vi.spyOn(document, "cookie", "set").mockImplementation((value) => {
      writes.push(String(value));
    });

    render(
      <WindowSelector
        path="/trending/notes"
        searchParams={new URLSearchParams("window=7d&lang=de")}
        activeWindow="7d"
        persist
      />
    );

    fireEvent.click(screen.getByRole("link", { name: "24h" }));
    expect(writes.at(-1)).toBe(
      `${DISCOVERY_WINDOW_PREFERENCE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
    );

    fireEvent.click(screen.getByRole("link", { name: "30d" }));
    expect(writes.at(-1)).toContain(`${DISCOVERY_WINDOW_PREFERENCE_COOKIE}=30d;`);
    cookie.mockRestore();
  });

  it("does not record a search or relay range as the Discover choice", () => {
    const writes: string[] = [];
    const cookie = vi.spyOn(document, "cookie", "set").mockImplementation((value) => {
      writes.push(String(value));
    });

    render(
      <WindowSelector
        path="/search"
        searchParams={new URLSearchParams()}
        activeWindow="all"
        windows={["24h", "7d", "30d", "all"]}
        defaultWindow="all"
        labelFor={(window) => (window === "all" ? "All" : window)}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: "7d" }));
    expect(writes).toEqual([]);
    cookie.mockRestore();
  });
});
