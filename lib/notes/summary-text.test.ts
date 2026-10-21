import { describe, expect, it } from "vitest";

import { collapsePreviewWhitespace } from "./summary-text";

describe("collapsePreviewWhitespace", () => {
  it("folds paragraph breaks and runs of spaces into single spaces", () => {
    expect(collapsePreviewWhitespace("TITLE\n\n  Body line one.\nLine two.  ")).toBe(
      "TITLE Body line one. Line two."
    );
  });
});
