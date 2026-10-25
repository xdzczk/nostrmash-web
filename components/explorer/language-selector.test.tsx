import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { LanguageSelector } from "@/components/explorer/language-selector";
import { LANGUAGE_COOKIE } from "@/lib/search-params/language";

describe("LanguageSelector", () => {
  beforeAll(() => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  beforeEach(() => {
    push.mockClear();
  });

  it("renders languages ordered by count and omits unmarked codes", () => {
    render(
      <LanguageSelector
        path="/trending/notes"
        query="window=7d"
        options={[
          { language: "ja", count: 10 },
          { language: "und", count: 100 },
          { language: "de", count: 50 },
          { language: "und-uncertain", count: 40 },
          { language: "xx", count: 1 },
        ]}
      />
    );

    const select = screen.getByRole("combobox", { name: "Language" });
    const labels = Array.from(select.querySelectorAll("option")).map(
      (option) => option.textContent
    );
    expect(labels).toEqual(["All languages", "Deutsch", "日本語", "XX"]);
  });

  it("navigates with lang and clears it for all languages", () => {
    const writes: string[] = [];
    const cookie = vi.spyOn(document, "cookie", "set").mockImplementation((value) => {
      writes.push(String(value));
    });

    render(
      <LanguageSelector
        path="/trending/notes"
        query="window=7d&cursor=abc"
        activeLanguage="de"
        options={[{ language: "de", count: 4 }]}
      />
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "" },
    });

    expect(push).toHaveBeenCalledWith("/trending/notes?window=7d");
    expect(writes.at(-1)).toBe(`${LANGUAGE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`);
    cookie.mockRestore();
  });

  it("shows the language empty state instead of an error when a filtered ranking is empty", () => {
    render(
      <RankedListPage
        discoverView="notes"
        eyebrow=""
        title="Notes"
        subtitle="The notes leading the network."
        path="/trending/notes"
        searchParams={new URLSearchParams("lang=de")}
        window="24h"
        language="de"
        semantics={{}}
        errorMessage=""
        emptyTitle="No ranked notes yet"
        emptyMessage="Ranked notes have not populated for this window."
        hasItems={false}
        debugPayload={{}}
      >
        <p>rows</p>
      </RankedListPage>
    );

    expect(screen.getByText("Not enough notes in this language yet")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("No ranked notes yet")).not.toBeInTheDocument();
    expect(screen.getAllByText("Deutsch").length).toBeGreaterThan(0);
  });
});
