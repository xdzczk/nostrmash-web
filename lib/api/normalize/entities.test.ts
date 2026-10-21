import { describe, expect, it } from "vitest";

import { normalizeDomainEntries, normalizeEventRecord } from "@/lib/api/normalize/entities";

const HEX_ID = "00640a99a88846a44d8db324f28d0fbd137f6ca23158a5af0d0bbf9810569fea";
const HEX_PUBKEY = "8245d2287fda971e7f360512ab11b5c5a96baf5c28cdcff4da6bb347d27a1481";

describe("normalizeEventRecord", () => {
  it("lifts kind and tags from a nested `event` envelope", () => {
    const input = {
      event_id: HEX_ID,
      author_pubkey: HEX_PUBKEY,
      content: "",
      created_at: 1792520375,
      event: {
        id: HEX_ID,
        kind: 6,
        pubkey: HEX_PUBKEY,
        content: "",
        tags: [["e", "abc"]],
      },
    };
    const normalized = normalizeEventRecord(input);
    expect(normalized?.id).toBe(HEX_ID);
    expect(normalized?.kind).toBe(6);
    expect(normalized?.tags).toEqual([["e", "abc"]]);
    // Input must not be mutated.
    expect("kind" in input).toBe(false);
  });

  it("keeps top-level fields over envelope fields", () => {
    const normalized = normalizeEventRecord({
      id: HEX_ID,
      kind: 1,
      pubkey: HEX_PUBKEY,
      content: "top",
      event: { kind: 6, content: "nested" },
    });
    expect(normalized?.kind).toBe(1);
    expect(normalized?.content).toBe("top");
  });
});

describe("normalizeDomainEntries", () => {
  it("prefers canonical backend identity when provided", () => {
    expect(
      normalizeDomainEntries([
        {
          domain: "youtu.be",
          canonical_domain: "youtube.com",
          event_count: 12,
        },
      ])
    ).toMatchObject([{ domain: "youtube.com", count: 12 }]);
  });

  it("temporarily suppresses duplicate aliases without merging counts", () => {
    expect(
      normalizeDomainEntries([
        { domain: "www.example.com", count: 3 },
        { domain: "example.com", count: 8 },
        { domain: "youtu.be", count: 4 },
        { domain: "youtube.com", count: 7 },
      ])
    ).toEqual([
      expect.objectContaining({ domain: "example.com", count: 8 }),
      expect.objectContaining({ domain: "youtube.com", count: 7 }),
    ]);
  });
});
