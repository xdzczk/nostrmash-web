import { describe, expect, it, vi } from "vitest";

import { hasNativeSemantics, loadRankedListPayload } from "@/lib/explorer/ranked-list";

describe("ranked-list helpers", () => {
  it("detects native semantics presence", () => {
    expect(hasNativeSemantics({})).toBe(false);
    expect(hasNativeSemantics({ consistency: "eventual" })).toBe(true);
    expect(hasNativeSemantics({ trust_applied: false })).toBe(true);
  });

  it("loads a payload and extracts semantics on success", async () => {
    const { payload, errorMessage, semantics } = await loadRankedListPayload(
      async () => ({ notes: [], consistency: "strong", next_cursor: "abc" }),
      "Failed."
    );

    expect(errorMessage).toBe("");
    expect(payload?.next_cursor).toBe("abc");
    expect(semantics.consistency).toBe("strong");
  });

  it("maps loader failures to a user-facing message", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { payload, errorMessage } = await loadRankedListPayload(async () => {
      throw new Error("API 500: boom");
    }, "Failed to load ranking.");

    expect(payload).toBeNull();
    expect(errorMessage).toBe("Failed to load ranking.");
    vi.unstubAllEnvs();
  });
});
