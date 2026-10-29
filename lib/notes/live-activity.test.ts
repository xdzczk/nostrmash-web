import { describe, expect, it } from "vitest";

import { getLivePresentation, rankLiveActivities } from "@/lib/notes/live-activity";

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

  it("reads the current viewer count", () => {
    const presentation = getLivePresentation({
      id: "e".repeat(64),
      pubkey: PUBKEY,
      kind: 30311,
      tags: [
        ["title", "Stage"],
        ["status", "live"],
        ["current_participants", "12"],
      ],
    });
    expect(presentation?.currentParticipants).toBe(12);
  });
});

describe("rankLiveActivities", () => {
  const now = 1_800_000_000;

  function live(
    id: string,
    viewers: string | undefined,
    starts: number,
    counts?: Record<string, number>
  ) {
    return {
      id,
      pubkey: PUBKEY,
      kind: 30311,
      created_at: starts,
      tags: [
        ["title", id],
        ["status", "live"],
        ["starts", String(starts)],
        ...(viewers ? [["current_participants", viewers]] : []),
      ],
      ...counts,
    };
  }

  it("keeps streams that are live now and orders viewers, then engagement, then start", () => {
    const ranked = rankLiveActivities(
      [
        live("a".repeat(64), "1", now - 10),
        live("b".repeat(64), "4", now - 50, { reply_count: 1 }),
        live("c".repeat(64), "4", now - 20, { reply_count: 3, zap_count: 2 }),
        {
          ...live("d".repeat(64), "9", now - 5),
          tags: [
            ["title", "ended"],
            ["status", "live"],
            ["starts", String(now - 100)],
            ["ends", String(now - 1)],
            ["current_participants", "9"],
          ],
        },
        {
          ...live("f".repeat(64), "8", now + 60),
          tags: [
            ["title", "later"],
            ["status", "live"],
            ["starts", String(now + 60)],
            ["current_participants", "8"],
          ],
        },
      ],
      now
    );
    expect(ranked.map((event) => event.id[0])).toEqual(["c", "b", "a"]);
  });
});
