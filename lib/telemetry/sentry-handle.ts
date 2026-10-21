/**
 * Process-wide handle to the initialised Sentry SDK.
 *
 * Application code must not import `@sentry/nextjs` directly: under Turbopack
 * every route chunk group that reaches the import gets its own ~1.5 MB copy
 * of the server SDK, and OpenNext inlines them all into one worker script
 * (10 copies ≈ 15 MB of the 22 MB handler, i.e. the cold-start cost). Only the
 * two instrumentation entry points import the SDK; everything else goes
 * through this handle.
 */
export type SentryHandle = {
  withScope: (
    callback: (scope: {
      setTag: (key: string, value: string) => void;
      setExtra: (key: string, value: unknown) => void;
      setLevel: (level: "warning" | "info" | "error") => void;
    }) => void
  ) => void;
  captureException: (error: unknown) => void;
  captureMessage: (message: string) => void;
  addBreadcrumb: (breadcrumb: {
    category?: string;
    message?: string;
    level?: "info" | "warning" | "error";
    data?: Record<string, unknown>;
  }) => void;
};

const HANDLE_KEY = "__nostrmashSentry";

type HandleCarrier = typeof globalThis & { [HANDLE_KEY]?: SentryHandle };

export function setSentryHandle(sentry: SentryHandle): void {
  (globalThis as HandleCarrier)[HANDLE_KEY] = sentry;
}

export function getSentryHandle(): SentryHandle | null {
  return (globalThis as HandleCarrier)[HANDLE_KEY] ?? null;
}
