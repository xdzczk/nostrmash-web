import { describe, expect, it } from "vitest";

import { collectContentReferences } from "@/lib/notes/resolve-content-refs";

const PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const OTHER = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("collectContentReferences", () => {
  it("includes p-tags only when a bare @handle needs them", () => {
    const withoutHandle = collectContentReferences([
      { content: "plain note", tags: [["p", OTHER]] },
    ]);
    expect(withoutHandle.pubkeys).toEqual([]);

    const withHandle = collectContentReferences([
      {
        content: "Hi @Zapstore",
        tags: [
          ["p", OTHER],
          ["p", PUBKEY],
        ],
      },
    ]);
    expect(withHandle.pubkeys.sort()).toEqual([OTHER, PUBKEY].sort());
  });

  it("collects NIP-08 mention pubkeys without requiring a handle", () => {
    const refs = collectContentReferences([{ content: "Thanks #[0]", tags: [["p", PUBKEY]] }]);
    expect(refs.pubkeys).toEqual([PUBKEY]);
  });
});
