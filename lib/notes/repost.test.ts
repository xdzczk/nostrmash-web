import { describe, expect, it } from "vitest";

import { collectRepostTargetIds, isRepostEvent, parseRepostTarget } from "./repost";
import type { EventRecord } from "@/lib/types/api";

const ORIGINAL_ID = "05d0b8707c4179b720265f47799ce5e82c7d34ebf3908688850af26c146c7a5e";
const ORIGINAL_PUBKEY = "60a5cb046a60cc042b65047a52e901118e0b2d075327f2cbe60fba5275d37193";

const embeddedOriginal = {
  id: ORIGINAL_ID,
  pubkey: ORIGINAL_PUBKEY,
  created_at: 1_792_520_125,
  kind: 1,
  tags: [["r", "wss://nostr.wine/"]],
  content: "YOUTUBE JUST BANNED SIMPLY BITCOIN",
  sig: "00",
};

describe("parseRepostTarget", () => {
  it("parses the embedded JSON event from a kind 6 repost", () => {
    const repost: EventRecord = {
      id: "a".repeat(64),
      pubkey: "b".repeat(64),
      kind: 6,
      content: JSON.stringify(embeddedOriginal),
      tags: [
        ["e", ORIGINAL_ID, "wss://relay.example"],
        ["p", ORIGINAL_PUBKEY],
      ],
    };
    const target = parseRepostTarget(repost);
    expect(target.embedded?.id).toBe(ORIGINAL_ID);
    expect(target.embedded?.content).toBe("YOUTUBE JUST BANNED SIMPLY BITCOIN");
    expect(target.targetId).toBe(ORIGINAL_ID);
    expect(target.targetPubkey).toBe(ORIGINAL_PUBKEY);
  });

  it("falls back to e/p tags when content is empty", () => {
    const repost: EventRecord = {
      id: "a".repeat(64),
      kind: 6,
      content: "",
      tags: [
        ["e", ORIGINAL_ID],
        ["p", ORIGINAL_PUBKEY],
      ],
    };
    const target = parseRepostTarget(repost);
    expect(target.embedded).toBeUndefined();
    expect(target.targetId).toBe(ORIGINAL_ID);
    expect(target.targetPubkey).toBe(ORIGINAL_PUBKEY);
  });

  it("tolerates malformed JSON", () => {
    const repost: EventRecord = {
      id: "a".repeat(64),
      kind: 6,
      content: '{"id": "broken',
      tags: [["e", ORIGINAL_ID]],
    };
    expect(parseRepostTarget(repost)).toEqual({ targetId: ORIGINAL_ID, targetPubkey: undefined });
  });

  it("returns nothing for non-repost kinds", () => {
    expect(parseRepostTarget({ id: "x", kind: 1, content: "{}" })).toEqual({});
    expect(isRepostEvent({ id: "x", kind: 16 })).toBe(true);
    expect(isRepostEvent({ id: "x", kind: 7 })).toBe(false);
  });
});

describe("collectRepostTargetIds", () => {
  it("only lists targets that still need a lookup", () => {
    const embedded: EventRecord = {
      id: "a".repeat(64),
      kind: 6,
      content: JSON.stringify(embeddedOriginal),
      tags: [["e", ORIGINAL_ID]],
    };
    const bare: EventRecord = {
      id: "b".repeat(64),
      kind: 6,
      content: "",
      tags: [["e", "c".repeat(64)]],
    };
    const note: EventRecord = { id: "d".repeat(64), kind: 1, content: "hi" };
    expect(collectRepostTargetIds([embedded, bare, note])).toEqual(["c".repeat(64)]);
  });
});
