type ScopeLike = {
  setTag: (key: string, value: string) => void;
  setExtra: (key: string, value: unknown) => void;
  setLevel: (level: "warning" | "info" | "error") => void;
};

type SentryLike = {
  withScope: (callback: (scope: ScopeLike) => void) => void;
  captureException: (error: unknown) => void;
  captureMessage: (message: string) => void;
  addBreadcrumb: (breadcrumb: {
    category?: string;
    message?: string;
    level?: "info" | "warning" | "error";
    data?: Record<string, unknown>;
  }) => void;
};

function getSentry(): SentryLike | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    // Lazy require keeps this module importable in tests without initializing the SDK.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@sentry/nextjs") as SentryLike;
  } catch {
    return null;
  }
}

export function isSentryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN);
}

/** Expected upstream responses that should not become Sentry issues. */
export function isExpectedApiStatus(status: number | undefined): boolean {
  if (typeof status !== "number") return false;
  return status === 404 || status === 429 || status === 400 || status === 401 || status === 403;
}

/**
 * Collapse dynamic segments so rate-limit/timeout storms share one fingerprint
 * instead of one issue key per pubkey/event/hashtag.
 */
export function normalizeApiPath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{64}(?=\/|$)/gi, "/:hex")
    .replace(/\/npub1[02-9ac-hj-np-z]+(?=\/|$)/gi, "/:npub")
    .replace(/\/note1[02-9ac-hj-np-z]+(?=\/|$)/gi, "/:note")
    .replace(/\/nevent1[02-9ac-hj-np-z]+(?=\/|$)/gi, "/:nevent")
    .replace(/\/nprofile1[02-9ac-hj-np-z]+(?=\/|$)/gi, "/:nprofile")
    .replace(/\/hashtags\/[^/]+/gi, "/hashtags/:tag")
    .replace(/\/domains\/[^/]+/gi, "/domains/:domain");
}

export function captureApiError(
  error: unknown,
  context?: Record<string, unknown> & { level?: "warning" | "info" | "error" }
) {
  const sentry = getSentry();
  if (!sentry) return;

  const apiError =
    error && typeof error === "object" && "status" in error && "path" in error
      ? (error as {
          status?: number;
          code?: string;
          requestId?: string;
          path?: string;
        })
      : null;

  if (isExpectedApiStatus(apiError?.status)) {
    sentry.addBreadcrumb({
      category: "api",
      message: error instanceof Error ? error.message : "expected API response",
      level: "info",
      data: {
        status: apiError?.status,
        path: apiError?.path ? normalizeApiPath(apiError.path) : context?.path,
        requestId: apiError?.requestId ?? context?.requestId,
      },
    });
    return;
  }

  const level = context?.level ?? "error";

  sentry.withScope((scope) => {
    scope.setLevel(level);
    if (typeof apiError?.status === "number") {
      scope.setTag("api.status", String(apiError.status));
    }
    if (apiError?.code) scope.setTag("api.code", apiError.code);
    if (apiError?.requestId) scope.setTag("api.request_id", apiError.requestId);
    if (apiError?.path) {
      scope.setTag("api.route", normalizeApiPath(apiError.path));
      scope.setExtra("api.path", apiError.path);
    }
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (key === "level") continue;
        if (key === "path" && typeof value === "string") {
          scope.setTag("api.route", normalizeApiPath(value));
        }
        scope.setExtra(key, value);
      }
    }
    sentry.captureException(error);
  });
}

export function captureSchemaDrift(context: string, issues: unknown[]) {
  const sentry = getSentry();
  if (!sentry) return;
  sentry.withScope((scope) => {
    scope.setLevel("warning");
    scope.setTag("schema.context", context);
    scope.setExtra("issues", issues.slice(0, 5));
    sentry.captureMessage(`API schema drift: ${context}`);
  });
}

export function captureSlowApiCall(spanName: string, durationMs: number) {
  const sentry = getSentry();
  if (!sentry) return;
  sentry.addBreadcrumb({
    category: "api",
    message: `${spanName} took ${durationMs}ms`,
    level: "info",
    data: { durationMs },
  });
}
