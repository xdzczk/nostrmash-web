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
  });

  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.info("[instrumentation] Sentry initialized for server runtime");
  }
}

export const onRequestError = Sentry.captureRequestError;
