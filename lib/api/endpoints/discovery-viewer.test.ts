import { describe, expect, it } from "vitest";

import { buildCursorQuery, buildOffsetQuery } from "@/lib/api/endpoints/shared";

const VIEWER = "ab".repeat(32);

describe("discovery viewer query", () => {
  it("omits an absent or invalid viewer and forwards a valid one", () => {
    expect(buildCursorQuery({ window: "24h", limit: 20 })).toEqual({
      cursor: undefined,
      limit: 20,
      offset: undefined,
      window: "24h",
      kind: undefined,
    });
    expect(buildOffsetQuery({ window: "7d", offset: 20, viewer: "not-a-key" })).toEqual({
      limit: undefined,
      offset: 20,
      window: "7d",
    });
    expect(buildCursorQuery({ limit: 20, viewer: VIEWER })).toMatchObject({ viewer: VIEWER });
    expect(buildOffsetQuery({ viewer: ` ${VIEWER} ` })).toMatchObject({ viewer: VIEWER });
  });
});
