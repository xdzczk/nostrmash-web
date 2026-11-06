import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EventLabelSummary } from "@/components/explorer/event-label-summary";

describe("EventLabelSummary", () => {
  it("renders nothing when the only label is a hidden machine marker", () => {
    const { container } = render(
      <EventLabelSummary labels={[{ namespace: "pub.ditto.trends", label: "rising" }]} />
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("heading", { name: "Labels" })).not.toBeInTheDocument();
  });

  it("names the machine labels a toggle would reveal", () => {
    render(
      <EventLabelSummary
        labels={[
          { namespace: "ugc", label: "funny" },
          { namespace: "pub.ditto.trends", label: "rising" },
        ]}
      />
    );
    expect(screen.getByText("funny")).toBeInTheDocument();
    expect(screen.queryByText("rising")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show 1 machine label" })).toBeInTheDocument();
  });
});
