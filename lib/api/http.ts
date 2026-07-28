import type { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { appConfig } from "@/lib/config";
import { toNextFetchConfig, type CacheClass } from "@/lib/caching/policies";
import { softParseApiPayload } from "@/lib/api/schemas/parse";
import { traceApiCall } from "@/lib/telemetry/trace";
import type { ApiErrorBody, ApiErrorDetails } from "@/lib/types/api";

export { ApiError, isApiError } from "@/lib/api/errors";

/** Bound upstream waits so SSR pages cannot hang indefinitely when the API is slow. */
const DEFAULT_TIMEOUT_MS: Record<CacheClass, number> = {
  static: 12_000,
  shortTtl: 8_000,
  requestTime: 10_000,
};

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

function formatErrorDetails(details: ApiErrorDetails): string {
  const message = typeof details.message === "string" ? details.message : undefined;
  const code = typeof details.code === "string" ? details.code : undefined;
  const requestId = typeof details.request_id === "string" ? details.request_id : undefined;
  const parts = [message ?? code, requestId ? `request_id: ${requestId}` : undefined].filter(
    Boolean
  );
  return parts.join(" - ");
}

function formatErrorValue(
  value: ApiErrorBody["error"] | ApiErrorBody["message"]
): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    return formatErrorDetails(value);
  }
  return undefined;
}

function parseErrorMessage(body: ApiErrorBody | undefined, statusText: string): string {
  if (!body) {
    return statusText || "Unknown API error";
  }
  const message =
    formatErrorValue(body.message) ?? formatErrorValue(body.error) ?? body.code ?? statusText;
  return message || "Unknown API error";
}

function normalizeErrorText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

export function isApiTimeoutError(error: unknown): boolean {
  if (isAbortError(error)) return true;
  if (!(error instanceof Error)) return false;
  return /timed out|aborted|AbortError|TimeoutError/i.test(error.message);
}

function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const active = signals.filter((signal) => signal != null);
  if (active.length === 0) {
    return new AbortController().signal;
  }
  if (active.length === 1) {
    return active[0]!;
  }
  const AbortSignalAny = (
    AbortSignal as typeof AbortSignal & {
      any?: (signals: AbortSignal[]) => AbortSignal;
    }
  ).any;
  if (typeof AbortSignalAny === "function") {
    return AbortSignalAny(active);
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const signal of active) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

export async function fetchApiJson<T>(
  path: string,
  options?: {
    query?: Record<string, string | number | undefined>;
    cacheClass?: CacheClass;
    timeoutMs?: number;
    init?: RequestInit;
    schema?: z.ZodTypeAny;
  }
): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options?.query ?? {})) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }

  const cacheClass = options?.cacheClass ?? "requestTime";
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS[cacheClass];
  const timeoutSignal =
    typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(timeoutMs)
      : (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), timeoutMs);
          return controller.signal;
        })();
  const signal = combineAbortSignals(
    [timeoutSignal, options?.init?.signal].filter((value): value is AbortSignal => Boolean(value))
  );

  let response: Response;
  try {
    response = await traceApiCall(`api:${path}`, async () =>
      fetch(buildApiUrl(path, query), {
        method: "GET",
        ...toNextFetchConfig(cacheClass),
        ...options?.init,
        signal,
        headers: {
          Accept: "application/json",
          ...(options?.init?.headers ?? {}),
        },
      })
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`API request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw error;
  }

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
    throw ApiError.fromResponse(
      response.status,
      response.statusText,
      path,
      errorBody,
      response.headers.get("x-request-id"),
      `${message}${details}`
    );
  }

  const json = (await response.json()) as T;
  if (options?.schema) {
    return softParseApiPayload(options.schema, json, `api:${path}`) as T;
  }
  return json;
}
