import { UI_VERSION } from "@/lib/ui/version";
import {
  getSentryClient,
  isSentryClientEnabled,
  loadSentryClient,
  type SentryClientModule,
} from "@/lib/telemetry/sentry-client";
import { setSentryHandle } from "@/lib/telemetry/sentry-handle";

/**
 * The browser SDK is deferred off the critical path: it is imported in idle
 * time (or immediately on the first uncaught error), initialised, and any
 * errors that fired before it arrived are replayed into it. This keeps the
 * ~120KB (gzip) SDK out of the LCP window without losing early exceptions.
 */
const earlyErrors: unknown[] = [];

function initSentry(sentry: SentryClientModule) {
  sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: true,
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    initialScope: {
      tags: {
        ui_version: UI_VERSION,
      },
    },
  });
  setSentryHandle(sentry);
  for (const error of earlyErrors.splice(0)) {
    sentry.captureException(error);
  }
}

function start() {
  return loadSentryClient(initSentry);
}

if (isSentryClientEnabled() && typeof window !== "undefined") {
  const onError = (event: ErrorEvent) => {
    earlyErrors.push(event.error ?? new Error(event.message));
    void start();
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    earlyErrors.push(event.reason);
    void start();
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  const schedule = () => {
    void start().then(() => {
      // The SDK installs its own global handlers once initialised.
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    });
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(schedule, { timeout: 4000 });
  } else {
    window.setTimeout(schedule, 2500);
  }
}

export function onRouterTransitionStart(href: string, navigationType: string) {
  getSentryClient()?.captureRouterTransitionStart(href, navigationType);
}
