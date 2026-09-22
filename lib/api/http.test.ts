import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchApiJson, isApiTimeoutError } from "@/lib/api/http";
import { __resetLkgMemoryForTests } from "@/lib/api/last-known-good";
import type * as SentryModule from "@/lib/telemetry/sentry";

const captureApiError = vi.fn();

vi.mock("@/lib/telemetry/sentry", async () => {
  const actual = await vi.importActual<typeof SentryModule>("@/lib/telemetry/sentry");
  return {
    ...actual,
    captureApiError: (...args: unknown[]) => captureApiError(...args),
  };
});

describe("fetchApiJson timeouts", () => {
  beforeEach(() => {
    captureApiError.mockClear();
    __resetLkgMemoryForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    __resetLkgMemoryForTests();
  });

  it("aborts slow upstream calls when no last-known-good entry exists", async () => {
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

  it("retries subrequests that hit a Cloudflare challenge and returns the clean response", async () => {
    const challenge = () =>
      new Response("<html>Just a moment...</html>", {
        status: 403,
        headers: { "content-type": "text/html", "cf-mitigated": "challenge" },
      });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(challenge())
      .mockResolvedValueOnce(challenge())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ hashtag: "nsfw", notes: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchApiJson("/api/v1/discovery/hashtags/nsfw/notes", { cacheClass: "requestTime" })
    ).resolves.toMatchObject({ hashtag: "nsfw" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws after persistent challenges when no last-known-good entry exists", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("<html>Just a moment...</html>", {
          status: 403,
          headers: { "content-type": "text/html", "cf-mitigated": "challenge" },
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchApiJson("/api/v1/discovery/hashtags/nsfw/notes", { cacheClass: "requestTime" })
    ).rejects.toMatchObject({ status: 403 });
    // Initial attempt plus one retry per configured backoff.
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
