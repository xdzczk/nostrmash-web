import { describe, expect, it } from "vitest";

import { formatThreadActivityLine } from "./thread-activity";

describe("formatThreadActivityLine", () => {
  it("joins the counts the activity endpoint actually returns", () => {
    expect(formatThreadActivityLine({ replies24h: 22, participantCount: 69 })).toBe(
      "22 in the last day · 69 people"
    );
  });

  it("drops missing or zero figures", () => {
    expect(formatThreadActivityLine({ replies24h: 0, participantCount: 1 })).toBe("1 person");
    expect(formatThreadActivityLine({})).toBeNull();
  });
});
