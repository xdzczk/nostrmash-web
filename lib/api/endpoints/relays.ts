import type {
  PopularRelaysResponse,
  RelayHealthApiResponse,
  RelayHealthResponse,
  RelayInfoResponse,
  RelayOverlapResponse,
  RelayProbeHealthResponse,
  RelayPropagationResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import { normalizeRelayHealthResponse } from "@/lib/api/normalize";
import { normalizeRelayOverlap, normalizeRelayPropagation } from "@/lib/api/normalize/ecosystem";
import { relayOverlapSchema, relayPropagationSchema } from "@/lib/api/schemas/ecosystem";
import type { CacheClass } from "@/lib/caching/policies";
import { buildCursorQuery, type CursorQuery, nativeApiV1Routes } from "@/lib/api/endpoints/shared";
import type { StatsWindow } from "@/lib/search-params/window";

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

export async function getRelayInfo(
  cacheClass: CacheClass = "shortTtl",
  relayUrl: string
): Promise<RelayInfoResponse> {
  return fetchApiJson<RelayInfoResponse>(nativeApiV1Routes.relayInfo, {
    cacheClass,
    query: { relay_url: relayUrl },
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

export async function getRelayPropagation(
  cacheClass: CacheClass = "shortTtl",
  window?: StatsWindow
): Promise<RelayPropagationResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.relayPropagation, {
    cacheClass,
    query: window ? { window } : undefined,
    schema: relayPropagationSchema,
  });
  return normalizeRelayPropagation(response);
}

export async function getRelayOverlap(
  cacheClass: CacheClass = "shortTtl",
  window?: StatsWindow
): Promise<RelayOverlapResponse> {
  const response = await fetchApiJson<unknown>(nativeApiV1Routes.relayOverlap, {
    cacheClass,
    query: window ? { window } : undefined,
    schema: relayOverlapSchema,
  });
  return normalizeRelayOverlap(response);
}
