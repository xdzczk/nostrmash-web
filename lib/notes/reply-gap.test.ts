import { describe, expect, it } from "vitest";

import { accountedReplyCount, formatUnindexedReplyLine, unindexedReplyCount } from "./reply-gap";

describe("reply gap", () => {
  it("counts a direct reply and the branch the reader can still open", () => {
    expect(
      accountedReplyCount([
        { id: "a", reply_count: 1 },
        { id: "b" },
        { id: "c", counts: { reply_count: 2 } },
      ])
    ).toBe(6);
  });

  it("describes only the replies that are neither listed nor expandable", () => {
    expect(unindexedReplyCount(13, 17)).toBe(4);
    expect(unindexedReplyCount(77, 89)).toBe(12);
    expect(unindexedReplyCount(5, 5)).toBe(0);
    expect(unindexedReplyCount(4, undefined)).toBe(0);
    expect(formatUnindexedReplyLine(1)).toBe("1 reply isn't in the index.");
    expect(formatUnindexedReplyLine(4)).toBe("4 replies aren't in the index.");
    expect(formatUnindexedReplyLine(0)).toBeNull();
  });
});
