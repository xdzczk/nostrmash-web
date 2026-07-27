/**
 * Map unexpected/API errors to copy safe for end users.
 * In development, keep the raw message so local debugging stays fast.
 */
export function toUserFacingErrorMessage(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV !== "production") {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }
    if (typeof error === "string" && error.trim().length > 0) {
      return error;
    }
  }

  return fallback;
}
