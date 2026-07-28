import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BarChart } from "@/components/charts/bar-chart";
import { Sparkline } from "@/components/charts/sparkline";

describe("Sparkline", () => {
  it("renders empty-state line when fewer than 2 points", () => {
    const { container } = render(<Sparkline points={[{ t: 1, v: 1 }]} />);
    expect(container.querySelector("line")).toBeTruthy();
  });

  it("renders path for series data", () => {
    const { container } = render(
      <Sparkline
        points={[
          { t: 1, v: 1 },
          { t: 2, v: 3 },
          { t: 3, v: 2 },
        ]}
      />
    );
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
  });
});

describe("BarChart", () => {
  it("shows empty-state copy with no points", () => {
    render(<BarChart points={[]} />);
    expect(screen.getByText(/no historical points yet/i)).toBeInTheDocument();
  });

  it("renders bars for series data", () => {
    const { container } = render(
      <BarChart
        label="Volume"
        points={[
          { t: 1, v: 10 },
          { t: 2, v: 20 },
        ]}
      />
    );
    expect(screen.getByRole("img", { name: "Volume" })).toBeInTheDocument();
    expect(container.querySelectorAll("rect").length).toBe(2);
  });
});
