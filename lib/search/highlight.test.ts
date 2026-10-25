import { describe, expect, it } from "vitest";

import { highlightTermsForQuery, splitHighlight } from "@/lib/search/highlight";

describe("splitHighlight", () => {
  it("marks the query without matching short tokens", () => {
    expect(splitHighlight("Bitcoin price today", ["bitcoin", "a"])).toEqual([
      { text: "Bitcoin", match: true },
      { text: " price today", match: false },
    ]);
  });

  it("prefers the longer term when one term contains another", () => {
    expect(splitHighlight("bitcoiners", ["bit", "bitcoin"])).toEqual([
      { text: "bitcoin", match: true },
      { text: "ers", match: false },
    ]);
  });
});

describe("highlightTermsForQuery", () => {
  it("drops wrapping quotes and hashtag marks", () => {
    expect(highlightTermsForQuery('"not your keys"')).toEqual(["not", "your", "keys"]);
    expect(highlightTermsForQuery("#bitcoin")).toEqual(["bitcoin"]);
  });
});
