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

/**
 * Durable LKG storage is only worth its R2 write cost for the small, bounded
 * set of pages every visitor shares (home, trending, stats, discovery,
 * relay listings). Per-entity endpoints (notes/profiles/hashtags/domains by
 * id, search, suggest) have an effectively unbounded key space — crawlers
 * alone can drive millions of distinct keys — and a fallback for a page
 * nobody will request twice has no value anyway. Keep this list in sync
 * with the non-parameterized routes in `lib/api/endpoints/shared.ts`.
 */
const LKG_ELIGIBLE_PATHS = new Set<string>([
  "/api/v1/discovery/home",
  "/api/v1/discovery/notes/trending",
  "/api/v1/discovery/long-form/trending",
  "/api/v1/discovery/profiles/trending",
  "/api/v1/discovery/conversations/hot",
  "/api/v1/discovery/profiles/rising",
  "/api/v1/discovery/hashtags/trending",
  "/api/v1/discovery/domains/trending",
  "/api/v1/discovery/stats/network",
  "/api/v1/discovery/stats/content",
  "/api/v1/discovery/stats/relays",
  "/api/v1/discovery/stats/series",
  "/api/v1/relays/health",
  "/api/v1/relays/popular",
  "/api/v1/relays/probe-health",
]);

export function isLkgEligiblePath(path: string): boolean {
  return LKG_ELIGIBLE_PATHS.has(path);
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

/**
 * LKG only needs to be "fresh enough" to serve as an outage fallback, not
 * updated on every single request. Without this throttle, every cacheable
 * API call durably writes to R2 (a billed Class A op) regardless of how
 * recently the same key was already written — which is what drove this
 * bucket's R2 write volume far higher than actual traffic warranted.
 */
const R2_WRITE_THROTTLE_MS = 5 * 60 * 1000;

async function isAlreadyFreshInR2(key: string, now: number): Promise<boolean> {
  const remote = await readR2(key);
  return Boolean(remote && now - remote.storedAt < R2_WRITE_THROTTLE_MS);
}

export async function storeLastKnownGood(key: string, payload: unknown): Promise<void> {
  const now = Date.now();
  const entry: LkgEntry = { payload, storedAt: now };
  const cached = memoryStore.get(key);
  memoryStore.set(key, entry);

  if (cached && now - cached.storedAt < R2_WRITE_THROTTLE_MS) {
    return;
  }
  if (!cached && (await isAlreadyFreshInR2(key, now))) {
    return;
  }
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
