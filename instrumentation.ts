import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

export async function register() {
  if (!dsn) {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      console.info("[instrumentation] Sentry disabled (no DSN configured)");
    }
    return;
  }

  Sentry.init({
    dsn,
    enabled: true,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    // Defense in depth: page loaders soft-handle these, but onRequestError can
    // still see them if a route lets an ApiError bubble.
    ignoreErrors: [/API 404\b/i, /API 429\b/i, /too many requests/i, /hashtag not found/i],
    beforeSend(event, hint) {
      const message =
        (typeof hint.originalException === "object" &&
        hint.originalException &&
        "message" in hint.originalException
          ? String((hint.originalException as { message?: unknown }).message)
          : undefined) ??
        event.exception?.values?.[0]?.value ??
        event.message;
      if (typeof message === "string" && /API (404|429)\b/i.test(message)) {
        return null;
      }
      return event;
    },
  });

  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.info("[instrumentation] Sentry initialized for server runtime");
  }
}

export const onRequestError = Sentry.captureRequestError;
