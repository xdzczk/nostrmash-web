import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IndexedAt } from "@/components/freshness/indexed-at";
import { LiveRefresh } from "@/components/freshness/live-refresh";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("IndexedAt", () => {
  it("renders nothing without a timestamp", () => {
    const { container } = render(<IndexedAt computedAt={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a fresh relative label", () => {
    const nowMs = Date.parse("2026-07-28T12:10:00.000Z");
    render(<IndexedAt computedAt="2026-07-28T12:00:00.000Z" nowMs={nowMs} label="Last indexed" />);
    expect(screen.getByText(/Last indexed 10m ago/i)).toBeInTheDocument();
  });

  it("warns loudly when the index is stale", () => {
    const nowMs = Date.parse("2026-07-28T14:00:00.000Z");
    render(<IndexedAt computedAt="2026-07-28T12:00:00.000Z" nowMs={nowMs} />);
    expect(screen.getByText(/Index last updated 2h ago/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("LiveRefresh", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes on interval while the tab is visible", () => {
    render(<LiveRefresh intervalMs={1000} />);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("skips refresh when the tab is hidden", () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    render(<LiveRefresh intervalMs={1000} />);
    vi.advanceTimersByTime(3000);
    expect(refresh).not.toHaveBeenCalled();
  });
});
