import type {
  DomainDetailApiResponse,
  DomainDetailResponse,
  DomainNotesApiResponse,
  DomainNotesResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import { normalizeDomainDetailResponse, normalizeDomainNotesResponse } from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import {
  buildCursorQuery,
  type CursorQuery,
  nativeApiV1Routes,
  normalizeDomainQuery,
} from "@/lib/api/endpoints/shared";

export async function getDomainDetail(
  domain: string,
  cacheClass: CacheClass = "shortTtl"
): Promise<DomainDetailResponse> {
  const normalizedDomain = normalizeDomainQuery(domain);
  const response = await fetchApiJson<DomainDetailApiResponse>(
    nativeApiV1Routes.domainByName(normalizedDomain),
    {
      cacheClass,
    }
  );
  return normalizeDomainDetailResponse(response);
}

export async function getDomainNotes(
  domain: string,
  cacheClass: CacheClass = "shortTtl",
  query?: CursorQuery
): Promise<DomainNotesResponse> {
  const normalizedDomain = normalizeDomainQuery(domain);
  const response = await fetchApiJson<DomainNotesApiResponse>(
    nativeApiV1Routes.domainNotesByName(normalizedDomain),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeDomainNotesResponse(response);
}
