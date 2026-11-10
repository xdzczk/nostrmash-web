import { describe, expect, it } from "vitest";

import { resolveByteRange } from "@/lib/media/byte-range";

describe("resolveByteRange", () => {
  it("answers the two-byte probe Safari sends before it plays a video", () => {
    expect(resolveByteRange("bytes=0-1", 18_142)).toEqual({ start: 0, end: 1 });
  });

  it("reads an open range to the last byte", () => {
    expect(resolveByteRange("bytes=100-", 500)).toEqual({ start: 100, end: 499 });
  });

  it("clamps an end past the body", () => {
    expect(resolveByteRange("bytes=0-99999", 500)).toEqual({ start: 0, end: 499 });
  });

  it("reads a suffix from the end", () => {
    expect(resolveByteRange("bytes=-100", 500)).toEqual({ start: 400, end: 499 });
    expect(resolveByteRange("bytes=-9999", 500)).toEqual({ start: 0, end: 499 });
  });

  it("serves the whole body when no usable range is asked for", () => {
    expect(resolveByteRange(null, 500)).toBeNull();
    expect(resolveByteRange("", 500)).toBeNull();
    expect(resolveByteRange("items=0-1", 500)).toBeNull();
    expect(resolveByteRange("bytes=0-1,5-9", 500)).toBeNull();
    expect(resolveByteRange("bytes=-", 500)).toBeNull();
  });

  it("rejects a range that starts past the end", () => {
    expect(resolveByteRange("bytes=500-", 500)).toBe("unsatisfiable");
    expect(resolveByteRange("bytes=9-3", 500)).toBe("unsatisfiable");
    expect(resolveByteRange("bytes=-0", 500)).toBe("unsatisfiable");
  });
});
