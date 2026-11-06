import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BarSeries } from "@/components/stats/bar-series";

const nov5 = Date.parse("2026-11-05T00:00:00Z") / 1000;
const nov6 = Date.parse("2026-11-06T00:00:00Z") / 1000;

describe("BarSeries", () => {
  it("dates a two-point series instead of joining the values", () => {
    render(
      <BarSeries
        label="Sats per day"
        points={[
          { t: nov5, v: 118168 },
          { t: nov6, v: 129075 },
        ]}
      />
    );

    expect(screen.getByText("Sats per day")).toBeInTheDocument();
    expect(
      screen.getByText(`Nov 5: ${(118168).toLocaleString()} · Nov 6: ${(129075).toLocaleString()}`)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(`${(118168).toLocaleString()} · ${(129075).toLocaleString()}`)
    ).not.toBeInTheDocument();
  });

  it("formats a single point with its day", () => {
    render(<BarSeries label="Reports" points={[{ t: nov6, v: 147 }]} />);
    expect(screen.getByText("Nov 6: 147")).toBeInTheDocument();
  });
});
