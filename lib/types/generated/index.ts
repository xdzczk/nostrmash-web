/**
 * Thin helpers over OpenAPI-generated types.
 * Regenerate with: `pnpm generate:api-types`
 */
import type { paths } from "@/lib/types/generated/api";

export type { paths, components, operations } from "@/lib/types/generated/api";

export type ApiPath = keyof paths;

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type PathOperation<P extends ApiPath, M extends HttpMethod> =
  paths[P] extends Record<M, infer Op> ? Op : never;

export type ApiJsonResponse<P extends ApiPath, M extends HttpMethod = "get"> =
  PathOperation<P, M> extends {
    responses: { 200: { content: { "application/json": infer Body } } };
  }
    ? Body
    : never;

export type GeneratedBatchEventsResponse = ApiJsonResponse<"/api/v1/events/batch", "post">;
export type GeneratedBatchProfilesResponse = ApiJsonResponse<"/api/v1/profiles/batch", "post">;
