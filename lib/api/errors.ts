import type { ApiErrorBody, ApiErrorDetails } from "@/lib/types/api";

function extractRequestId(
  body: ApiErrorBody | undefined,
  headerValue: string | null
): string | undefined {
  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }
  if (!body) return undefined;
  if (typeof body.request_id === "string" && body.request_id.length > 0) {
    return body.request_id;
  }
  const nested = body.error;
  if (nested && typeof nested === "object" && typeof nested.request_id === "string") {
    return nested.request_id;
  }
  return undefined;
}

function extractCode(body: ApiErrorBody | undefined): string | undefined {
  if (!body) return undefined;
  if (typeof body.code === "string") return body.code;
  if (typeof body.error === "object" && body.error && typeof body.error.code === "string") {
    return body.error.code;
  }
  return undefined;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly path: string;
  readonly body?: ApiErrorBody;

  constructor(options: {
    status: number;
    message: string;
    path: string;
    code?: string;
    requestId?: string;
    body?: ApiErrorBody;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.path = options.path;
    this.body = options.body;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  static fromResponse(
    status: number,
    statusText: string,
    path: string,
    body: ApiErrorBody | undefined,
    requestIdHeader: string | null,
    message: string
  ): ApiError {
    return new ApiError({
      status,
      message: `API ${status}: ${message || statusText || "Unknown API error"}`,
      path,
      code: extractCode(body),
      requestId: extractRequestId(body, requestIdHeader),
      body,
    });
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export type { ApiErrorDetails };
