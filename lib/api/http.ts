import { appConfig } from "@/lib/config";
import { toNextFetchConfig, type CacheClass } from "@/lib/caching/policies";
import { traceApiCall } from "@/lib/telemetry/trace";
import type { ApiErrorBody } from "@/lib/types/api";

function buildApiUrl(path: string, query?: URLSearchParams): string {
  const base = appConfig.apiBaseUrl.endsWith("/")
    ? appConfig.apiBaseUrl.slice(0, -1)
    : appConfig.apiBaseUrl;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${suffix}`);
  if (query) {
    url.search = query.toString();
  }
  return url.toString();
}

function parseErrorMessage(body: ApiErrorBody | undefined, statusText: string): string {
  if (!body) {
    return statusText || "Unknown API error";
  }
  const message = body.message ?? body.error ?? body.code ?? statusText;
  return message || "Unknown API error";
}

export async function fetchApiJson<T>(
  path: string,
  options?: {
    query?: Record<string, string | number | undefined>;
    cacheClass?: CacheClass;
    init?: RequestInit;
  }
): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options?.query ?? {})) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }

  const response = await traceApiCall(`api:${path}`, async () =>
    fetch(buildApiUrl(path, query), {
      method: "GET",
      ...toNextFetchConfig(options?.cacheClass ?? "requestTime"),
      ...options?.init,
      headers: {
        Accept: "application/json",
        ...(options?.init?.headers ?? {}),
      },
    })
  );

  if (!response.ok) {
    let errorBody: ApiErrorBody | undefined;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      errorBody = undefined;
    }
    throw new Error(`API ${response.status}: ${parseErrorMessage(errorBody, response.statusText)}`);
  }

  return (await response.json()) as T;
}
