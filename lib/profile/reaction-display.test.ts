import { describe, expect, it } from "vitest";

import { presentReactionContent } from "@/lib/profile/reaction-display";

describe("presentReactionContent", () => {
  it("leaves unicode reactions unchanged", () => {
    expect(presentReactionContent("💜", undefined)).toEqual({ text: "💜" });
  });

  it("resolves an https emoji tag and omits an unresolved shortcode", () => {
    const tags = [["emoji", "whoadude", "https://cdn.example/whoa.png"]];
    expect(presentReactionContent(":whoadude:", tags)).toEqual({
      text: "whoadude",
      imageUrl: "https://cdn.example/whoa.png",
    });
    expect(
      presentReactionContent(":leopoint:", [["emoji", "leopoint", "http://insecure/x.png"]])
    ).toEqual({
      text: "+",
    });
    expect(presentReactionContent(":missing:", tags)).toEqual({ text: "+" });
  });
});
