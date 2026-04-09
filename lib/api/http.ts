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

function normalizeErrorText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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
    let errorText = "";
    try {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        errorBody = (await response.json()) as ApiErrorBody;
      } else {
        errorText = normalizeErrorText(await response.text());
      }
    } catch {
      errorBody = undefined;
    }

    const message = parseErrorMessage(errorBody, response.statusText);
    const details = errorText ? ` (${errorText.slice(0, 240)})` : "";
    throw new Error(`API ${response.status}: ${message}${details}`);
  }

  return (await response.json()) as T;
}
