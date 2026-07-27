import type { StatsResponse } from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import type { CacheClass } from "@/lib/caching/policies";
import { nativeApiV1Routes } from "@/lib/api/endpoints/shared";

export async function getNetworkStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>(nativeApiV1Routes.networkStats, { cacheClass });
}

export async function getContentStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>(nativeApiV1Routes.contentStats, { cacheClass });
}

export async function getRelayStats(cacheClass: CacheClass = "shortTtl") {
  return fetchApiJson<StatsResponse>(nativeApiV1Routes.relayStats, { cacheClass });
}
