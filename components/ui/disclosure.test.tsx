import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Disclosure } from "@/components/ui/disclosure";

describe("Disclosure", () => {
  it("renders title and collapsed children in details", () => {
    render(
      <Disclosure title="Identity details" description="More info">
        <p>Hidden body</p>
      </Disclosure>
    );
    expect(screen.getByText("Identity details")).toBeInTheDocument();
    expect(screen.getByText("More info")).toBeInTheDocument();
    expect(screen.getByText("Hidden body")).toBeInTheDocument();
    const details = document.querySelector("details");
    expect(details?.open).toBe(false);
  });

  it("opens by default when requested", () => {
    render(
      <Disclosure title="Open" defaultOpen>
        <span>Visible</span>
      </Disclosure>
    );
    const details = document.querySelector("details");
    expect(details?.open).toBe(true);
  });
});
