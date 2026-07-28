import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchApiJson } from "@/lib/api/http";
import {
  __resetLkgMemoryForTests,
  buildLkgKey,
  getStaleDataNotice,
  isLkgCacheClass,
  markStaleDataServed,
  readLastKnownGood,
  storeLastKnownGood,
} from "@/lib/api/last-known-good";

vi.mock("@/lib/telemetry/sentry", async () => {
  const actual = await vi.importActual("@/lib/telemetry/sentry");
  return {
    ...(actual as object),
    captureApiError: vi.fn(),
  };
});

describe("last-known-good store", () => {
  beforeEach(() => {
    __resetLkgMemoryForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    __resetLkgMemoryForTests();
  });

  it("only caches shortTtl and static classes", () => {
    expect(isLkgCacheClass("shortTtl")).toBe(true);
    expect(isLkgCacheClass("static")).toBe(true);
    expect(isLkgCacheClass("requestTime")).toBe(false);
  });

  it("stores and reads payloads by stable key", async () => {
    const key = buildLkgKey("/api/v1/discovery/home", new URLSearchParams("window=24h"));
    await storeLastKnownGood(key, { notes: [] });
    const entry = await readLastKnownGood(key);
    expect(entry?.payload).toEqual({ notes: [] });
    expect(typeof entry?.storedAt).toBe("number");
  });

  it("serves stored payload on timeout for shortTtl fetches", async () => {
    const path = "/api/v1/discovery/home";
    await storeLastKnownGood(buildLkgKey(path, new URLSearchParams()), {
      notes: [{ id: "stale" }],
    });

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

    const payload = await fetchApiJson<{ notes: Array<{ id: string }> }>(path, {
      cacheClass: "shortTtl",
      timeoutMs: 20,
    });
    expect(payload.notes[0]?.id).toBe("stale");
  });

  it("overwrites stored payload on success", async () => {
    const path = "/api/v1/discovery/home";
    await storeLastKnownGood(buildLkgKey(path, new URLSearchParams()), {
      notes: [{ id: "old" }],
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ notes: [{ id: "fresh" }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
      )
    );

    const payload = await fetchApiJson<{ notes: Array<{ id: string }> }>(path, {
      cacheClass: "shortTtl",
    });
    expect(payload.notes[0]?.id).toBe("fresh");
    const stored = await readLastKnownGood(buildLkgKey(path, new URLSearchParams()));
    expect(stored?.payload).toEqual({ notes: [{ id: "fresh" }] });
  });
});

describe("stale notice registry", () => {
  beforeEach(() => {
    __resetLkgMemoryForTests();
  });

  it("returns null before any stale hit", () => {
    expect(getStaleDataNotice()).toBeNull();
  });

  it("returns the soft notice after a stale hit is marked", () => {
    markStaleDataServed();
    expect(getStaleDataNotice()).toBe("Showing earlier data — refreshing shortly.");
  });
});
