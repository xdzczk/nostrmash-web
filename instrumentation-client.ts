import * as Sentry from "@sentry/nextjs";
import { UI_VERSION } from "@/lib/ui/version";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
