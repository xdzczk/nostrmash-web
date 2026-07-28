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

export function captureApiError(error: unknown, context?: Record<string, unknown>) {
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

  sentry.withScope((scope) => {
    if (typeof apiError?.status === "number") {
      scope.setTag("api.status", String(apiError.status));
    }
    if (apiError?.code) scope.setTag("api.code", apiError.code);
    if (apiError?.requestId) scope.setTag("api.request_id", apiError.requestId);
    if (apiError?.path) scope.setExtra("api.path", apiError.path);
    if (context) {
      for (const [key, value] of Object.entries(context)) {
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
