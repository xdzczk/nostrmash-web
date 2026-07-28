import { isApiError } from "@/lib/api/errors";

const RATE_LIMITED = "The index is busy right now — this section will refresh shortly.";
const TIMEOUT = "This is taking longer than usual. Try again in a moment.";
const NOT_FOUND = "We couldn’t find that in the index.";
const GENERIC = "Something went wrong loading this section.";

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /timed out|AbortError|TimeoutError/i.test(error.message) || error.name === "TimeoutError";
}

/**
 * Map unexpected/API errors to copy safe for end users in every environment.
 * Raw messages and request IDs stay available via `toDevErrorDetail` for
 * expandable debug panels — they never become the primary banner text.
 */
export function toUserFacingErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    if (error.isRateLimited) return RATE_LIMITED;
    if (error.isNotFound) return fallback.trim().length > 0 ? fallback : NOT_FOUND;
    if (error.status >= 500) return fallback.trim().length > 0 ? fallback : GENERIC;
    return fallback.trim().length > 0 ? fallback : GENERIC;
  }

  if (isTimeoutError(error)) {
    return TIMEOUT;
  }

  return fallback.trim().length > 0 ? fallback : GENERIC;
}

/** Dev-only raw detail for expandable ErrorPanel diagnostics. */
export function toDevErrorDetail(error: unknown): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  if (isApiError(error)) {
    const parts = [
      error.message,
      error.requestId ? `request_id: ${error.requestId}` : undefined,
      error.path ? `path: ${error.path}` : undefined,
    ].filter(Boolean);
    return parts.join(" · ");
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return undefined;
}

/**
 * Consolidate a list of load-error strings into one calm banner.
 * Deduplicates identical messages and prefers a short refresh note when
 * there are multiple distinct failures.
 */
export function summarizeLoadErrors(errors: Array<string | undefined | null>): string | undefined {
  const unique = [
    ...new Set(
      errors
        .map((error) => (typeof error === "string" ? error.trim() : ""))
        .filter((error) => error.length > 0)
    ),
  ];

  if (unique.length === 0) return undefined;
  if (unique.length === 1) return unique[0];

  const allBusyOrTimeout = unique.every(
    (message) => message === RATE_LIMITED || message === TIMEOUT
  );
  if (allBusyOrTimeout) {
    return unique.includes(RATE_LIMITED) ? RATE_LIMITED : TIMEOUT;
  }

  return "Some sections are refreshing. Available data is shown below.";
}
