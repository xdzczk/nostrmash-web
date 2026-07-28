import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchApiJson, isApiTimeoutError } from "@/lib/api/http";

const captureApiError = vi.fn();

vi.mock("@/lib/telemetry/sentry", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/telemetry/sentry")>("@/lib/telemetry/sentry");
  return {
    ...actual,
    captureApiError: (...args: unknown[]) => captureApiError(...args),
  };
});

describe("fetchApiJson timeouts", () => {
  beforeEach(() => {
    captureApiError.mockClear();
  });

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

  it("records 404/429 as expected (breadcrumb path) without treating them as incidents", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: "hashtag not found" }), {
            status: 404,
            headers: { "content-type": "application/json", "x-request-id": "req-1" },
          })
      )
    );

    await expect(fetchApiJson("/api/v1/discovery/hashtags/missing")).rejects.toMatchObject({
      status: 404,
    });

    expect(captureApiError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 404 }),
      expect.objectContaining({ kind: "expected" })
    );
  });
});
