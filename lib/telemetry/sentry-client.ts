import type * as SentryNextjs from "@sentry/nextjs";

export type SentryClientModule = typeof SentryNextjs;

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

let loaded: SentryClientModule | null = null;
let loading: Promise<SentryClientModule | null> | null = null;

export function isSentryClientEnabled(): boolean {
  return Boolean(dsn);
}

/** The SDK module once it has been loaded and initialised, else null. */
export function getSentryClient(): SentryClientModule | null {
  return loaded;
}

/**
 * Load and initialise the browser SDK on demand. The SDK is the largest
 * script on the page and is not needed for first paint, so it is kept out of
 * the main bundle and pulled in from idle time (or the first error).
 */
export function loadSentryClient(init: (sentry: SentryClientModule) => void) {
  if (!dsn) return Promise.resolve(null);
  if (!loading) {
    loading = import("@sentry/nextjs")
      .then((sentry) => {
        init(sentry);
        loaded = sentry;
        return sentry;
      })
      .catch(() => null);
  }
  return loading;
}
