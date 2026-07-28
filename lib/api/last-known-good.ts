import { cache } from "react";

import type { CacheClass } from "@/lib/caching/policies";

export type LkgEntry = {
  payload: unknown;
  storedAt: number;
};

type R2LikeObject = {
  json: () => Promise<unknown>;
};

type R2LikeBucket = {
  get: (key: string) => Promise<R2LikeObject | null>;
  put: (
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string } }
  ) => Promise<unknown>;
};

const memoryStore = new Map<string, LkgEntry>();

const STALE_NOTICE = "Showing earlier data — refreshing shortly.";

type StaleRegistry = { hit: boolean };

const createStaleRegistry = (): StaleRegistry => ({ hit: false });

/** Request-scoped in RSC; a no-op passthrough under client React / Vitest. */
const getRequestScopedRegistry = cache(createStaleRegistry);

/**
 * Fallback when `React.cache` does not memoize (client bundle / unit tests).
 * Reset via `__resetLkgMemoryForTests`.
 */
let processFallbackRegistry: StaleRegistry | null = null;

function getStaleRegistry(): StaleRegistry {
  const first = getRequestScopedRegistry();
  const second = getRequestScopedRegistry();
  if (first === second) {
    return first;
  }
  if (!processFallbackRegistry) {
    processFallbackRegistry = createStaleRegistry();
  }
  return processFallbackRegistry;
}

export function isLkgCacheClass(cacheClass: CacheClass): boolean {
  return cacheClass === "shortTtl" || cacheClass === "static";
}

export function buildLkgKey(path: string, query: URLSearchParams): string {
  const sorted = new URLSearchParams([...query.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const qs = sorted.toString();
  return qs ? `lkg:${path}?${qs}` : `lkg:${path}`;
}

async function getR2Bucket(): Promise<R2LikeBucket | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const bucket = (env as { NEXT_INC_CACHE_R2_BUCKET?: R2LikeBucket }).NEXT_INC_CACHE_R2_BUCKET;
    return bucket ?? null;
  } catch {
    return null;
  }
}

async function readR2(key: string): Promise<LkgEntry | null> {
  try {
    const bucket = await getR2Bucket();
    if (!bucket) return null;
    const object = await bucket.get(key);
    if (!object) return null;
    const parsed = (await object.json()) as LkgEntry;
    if (!parsed || typeof parsed.storedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeR2(key: string, entry: LkgEntry): Promise<void> {
  try {
    const bucket = await getR2Bucket();
    if (!bucket) return;
    await bucket.put(key, JSON.stringify(entry), {
      httpMetadata: { contentType: "application/json" },
    });
  } catch {
    // Local next dev / missing binding — memory store is enough.
  }
}

export async function storeLastKnownGood(key: string, payload: unknown): Promise<void> {
  const entry: LkgEntry = { payload, storedAt: Date.now() };
  memoryStore.set(key, entry);
  await writeR2(key, entry);
}

export async function readLastKnownGood(key: string): Promise<LkgEntry | null> {
  const memory = memoryStore.get(key);
  if (memory) return memory;
  const remote = await readR2(key);
  if (remote) {
    memoryStore.set(key, remote);
  }
  return remote;
}

export function markStaleDataServed(): void {
  getStaleRegistry().hit = true;
}

export function getStaleDataNotice(): string | null {
  return getStaleRegistry().hit ? STALE_NOTICE : null;
}

/** Test helper — clears the in-memory LKG store and stale-notice fallback. */
export function __resetLkgMemoryForTests(): void {
  memoryStore.clear();
  processFallbackRegistry = null;
}
