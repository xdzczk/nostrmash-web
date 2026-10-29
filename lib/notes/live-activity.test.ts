import { describe, expect, it } from "vitest";

import { getLivePresentation } from "@/lib/notes/live-activity";

const PUBKEY = "b".repeat(64);
const HOST = "c".repeat(64);

describe("getLivePresentation", () => {
  it("reads NIP-53 tags including a role after the pubkey", () => {
    const presentation = getLivePresentation({
      id: "e".repeat(64),
      pubkey: PUBKEY,
      kind: 30311,
      tags: [
        ["d", "harbor-live"],
        ["title", "Harbor live"],
        ["summary", "A live activity"],
        ["status", "live"],
        ["streaming", "https://media.example.invalid/live.m3u8"],
        ["p", HOST, "Host"],
      ],
    });
    expect(presentation?.title).toBe("Harbor live");
    expect(presentation?.status).toBe("live");
    expect(presentation?.streaming).toBe("https://media.example.invalid/live.m3u8");
    expect(presentation?.participants).toEqual([{ pubkey: HOST, role: "Host" }]);
    expect(presentation?.identifier).toBe("harbor-live");
    expect(presentation?.naddr?.startsWith("naddr1")).toBe(true);
  });

  it("prefers an HLS streaming tag over MOQ and a web page", () => {
    const presentation = getLivePresentation({
      id: "e".repeat(64),
      pubkey: PUBKEY,
      kind: 30311,
      tags: [
        ["title", "Stage"],
        ["streaming", "moq://api.example:1443/"],
        ["streaming", "https://example.com/watch"],
        ["streaming", "https://media.example.invalid/live.m3u8"],
      ],
    });
    expect(presentation?.streaming).toBe("https://media.example.invalid/live.m3u8");
  });

  it("accepts the role in the relay position used by NIP-53", () => {
    const presentation = getLivePresentation({
      id: "e".repeat(64),
      pubkey: PUBKEY,
      kind: 30311,
      tags: [
        ["title", "Stage"],
        ["p", HOST, "wss://relay.example", "Speaker"],
      ],
    });
    expect(presentation?.participants[0]?.role).toBe("Speaker");
  });
});
