import { describe, expect, it } from "vitest";

import { isTickerTape, presentConversations } from "@/lib/discover/conversation-order";
import type { EventRecord } from "@/lib/types/api";

function note(id: string, content: string): EventRecord {
  return { id, pubkey: "aa", kind: 1, created_at: 1, content, tags: [] };
}

describe("presentConversations", () => {
  it("moves a cashtag dump behind a readable thread", () => {
    const ticker = note(
      "tape",
      "Final Tally $QQQ $TQQQ $SPY $IWM $SMCI $INTC $SOXL $MU $SOXS $NVDA $AMD"
    );
    const human = note("human", "the hades art is good but it is not sexy");
    expect(isTickerTape(ticker.content ?? "")).toBe(true);
    expect(isTickerTape(human.content ?? "")).toBe(false);
    expect(presentConversations([ticker, human]).map((entry) => entry.id)).toEqual([
      "human",
      "tape",
    ]);
  });

  it("leaves a page of only tapes in server order", () => {
    const first = note("a", "$QQQ $SPY $IWM $DIA $GLD $SLV $TLT $HYG $LQD");
    const second = note("b", "$AAPL $MSFT $NVDA $AMZN $META $GOOG $TSLA $AMD");
    expect(presentConversations([first, second]).map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});
