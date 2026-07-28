import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "@/components/ui/toast";

function Probe() {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.show("Hello")}>
        Default
      </button>
      <button type="button" onClick={() => toast.success("Copied")}>
        Success
      </button>
      <button type="button" onClick={() => toast.danger("Failed")}>
        Danger
      </button>
      <button
        type="button"
        onClick={() => {
          toast.show("One");
          toast.show("Two");
          toast.show("Three");
          toast.show("Four");
        }}
      >
        Flood
      </button>
    </div>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders success toasts and auto-dismisses them", () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Success" }));
    expect(screen.getByRole("status")).toHaveTextContent("Copied");

    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("dismisses a toast when clicked", () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Danger" }));
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Failed");

    fireEvent.click(status);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps at most three stacked toasts", () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Flood" }));
    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(3);
    expect(statuses.map((node) => node.textContent)).toEqual(["Two", "Three", "Four"]);
  });
});
