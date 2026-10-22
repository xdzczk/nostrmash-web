import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => pathname.current,
  useSearchParams: () => new URLSearchParams(),
}));

import { SearchForm } from "@/components/search/search-form";

describe("SearchForm", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("clears the header search after submitting", () => {
    pathname.current = "/trending/notes";
    render(<SearchForm variant="global" inputId="global-search-input" />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "bitcoin" } });
    fireEvent.submit(input.closest("form")!);

    expect(push).toHaveBeenCalledWith("/search?q=bitcoin&tab=all");
    expect(input).toHaveValue("");
  });

  it("clears the header search when the route changes before submit", () => {
    pathname.current = "/trending/notes";
    const { rerender } = render(<SearchForm variant="global" />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "bitcoin" } });
    expect(input).toHaveValue("bitcoin");

    pathname.current = "/relays";
    rerender(<SearchForm variant="global" />);

    expect(input).toHaveValue("");
  });

  it("keeps the query on the results-page search form", () => {
    pathname.current = "/search";
    render(<SearchForm initialQuery="bitcoin" />);
    const input = screen.getByRole("combobox");

    expect(input).toHaveValue("bitcoin");
    fireEvent.change(input, { target: { value: "nostr" } });
    fireEvent.submit(input.closest("form")!);

    expect(push).toHaveBeenCalledWith("/search?q=nostr&tab=all");
    expect(input).toHaveValue("nostr");
  });
});
