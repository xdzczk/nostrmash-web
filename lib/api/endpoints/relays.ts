import type {
  PopularRelaysResponse,
  RelayHealthApiResponse,
  RelayHealthResponse,
  RelayProbeHealthResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import { normalizeRelayHealthResponse } from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import { buildCursorQuery, type CursorQuery, nativeApiV1Routes } from "@/lib/api/endpoints/shared";

export async function getRelayHealth(
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<RelayHealthResponse> {
  const response = await fetchApiJson<RelayHealthApiResponse>(nativeApiV1Routes.relayHealth, {
    cacheClass,
    query: buildCursorQuery(query),
  });
  return normalizeRelayHealthResponse(response);
}

export async function getPopularRelays(
  cacheClass: CacheClass = "shortTtl",
  options?: { limit?: number }
): Promise<PopularRelaysResponse> {
  return fetchApiJson<PopularRelaysResponse>(nativeApiV1Routes.relayPopular, {
    cacheClass,
    query: { limit: options?.limit },
  });
}

export async function getRelayProbeHealth(
  cacheClass: CacheClass = "shortTtl",
  options?: { limit?: number }
): Promise<RelayProbeHealthResponse> {
  return fetchApiJson<RelayProbeHealthResponse>(nativeApiV1Routes.relayProbeHealth, {
    cacheClass,
    query: { limit: options?.limit },
  });
}
