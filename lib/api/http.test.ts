import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchApiJson, isApiTimeoutError } from "@/lib/api/http";

describe("fetchApiJson timeouts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("aborts slow upstream calls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) return;
          signal.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      })
    );

    await expect(
      fetchApiJson("/api/v1/discovery/home", { cacheClass: "shortTtl", timeoutMs: 20 })
    ).rejects.toThrow(/timed out/i);
  });

  it("detects timeout errors", () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    expect(isApiTimeoutError(abortError)).toBe(true);
    expect(isApiTimeoutError(new Error("API request timed out after 8000ms: /x"))).toBe(true);
    expect(isApiTimeoutError(new Error("API 500: boom"))).toBe(false);
  });
});
