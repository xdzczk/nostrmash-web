import { afterEach, describe, expect, it, vi } from "vitest";

import { eventRecordSchema, profileSchema } from "@/lib/api/schemas/core";
import { softParseApiPayload } from "@/lib/api/schemas/parse";

describe("softParseApiPayload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed data when the payload matches", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const parsed = softParseApiPayload(
      profileSchema,
      { pubkey: "abc", display_name: "Ada", extra: true },
      "profile"
    );

    expect(parsed.pubkey).toBe("abc");
    expect(parsed.display_name).toBe("Ada");
    expect((parsed as { extra?: boolean }).extra).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to the original value and logs on mismatch", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const raw = { id: 123 };
    const parsed = softParseApiPayload(eventRecordSchema, raw, "event");

    expect(parsed).toBe(raw);
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).toContain("[schema] event failed soft validation");
  });
});
