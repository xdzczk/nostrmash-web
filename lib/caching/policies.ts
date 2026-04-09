export type CacheClass = "static" | "shortTtl" | "requestTime";

export const CACHE_REVALIDATE_SECONDS: Record<CacheClass, number | false> = {
  static: 60 * 60 * 24,
  shortTtl: 60,
  requestTime: false,
};

export function toNextFetchConfig(cacheClass: CacheClass): {
  cache?: RequestCache;
  next?: { revalidate?: number };
} {
  if (cacheClass === "requestTime") {
    return { cache: "no-store" };
  }

  const revalidate = CACHE_REVALIDATE_SECONDS[cacheClass];
  return {
    next: typeof revalidate === "number" ? { revalidate } : undefined,
  };
}
