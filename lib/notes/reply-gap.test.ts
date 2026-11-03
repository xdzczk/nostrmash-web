import { describe, expect, it } from "vitest";

import {
  accountedConversationCount,
  accountedReplyCount,
  formatUnindexedReplyLine,
  unindexedReplyCount,
} from "./reply-gap";

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

  it("counts a top-level comment and skips one nested under a listed reply", () => {
    const focal = "f".repeat(64);
    const replyId = "a".repeat(64);
    expect(
      accountedConversationCount(
        [{ id: replyId, reply_count: 1 }],
        [
          {
            id: "b".repeat(64),
            kind: 1111,
            tags: [["e", focal, "", "p".repeat(64)]],
          },
          {
            id: "c".repeat(64),
            kind: 1111,
            tags: [["e", replyId, "", "p".repeat(64)]],
          },
        ],
        focal
      )
    ).toBe(3);
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
