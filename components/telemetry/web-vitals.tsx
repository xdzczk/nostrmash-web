"use client";

import { useReportWebVitals } from "next/web-vitals";

import { getSentryHandle, type SentryHandle } from "@/lib/telemetry/sentry-handle";

type MetricName = "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";

type VitalMetric = { name: string; value: number; id: string; rating?: string };

const pending: VitalMetric[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushAttempts = 0;
const MAX_FLUSH_ATTEMPTS = 15;

function send(sentry: SentryHandle, metric: VitalMetric) {
  const name = metric.name as MetricName;
  const metrics = (
    sentry as unknown as {
      metrics?: { distribution?: (name: string, value: number, options?: object) => void };
    }
  ).metrics;
  if (typeof metrics?.distribution === "function") {
    metrics.distribution(`web_vital.${name.toLowerCase()}`, metric.value, {
      unit: name === "CLS" ? "none" : "millisecond",
      tags: { rating: metric.rating ?? "unknown" },
    });
    return;
  }
  sentry.addBreadcrumb({
    category: "web-vital",
    message: `${name}=${metric.value}`,
    level: "info",
    data: { id: metric.id, rating: metric.rating },
  });
}

/**
 * Vitals usually fire before the deferred SDK has loaded (see
 * instrumentation-client.ts), so they are queued and flushed once it is up.
 */
function flush() {
  flushTimer = null;
  const sentry = getSentryHandle();
  if (!sentry) {
    flushAttempts += 1;
    if (pending.length > 0 && flushAttempts < MAX_FLUSH_ATTEMPTS) {
      flushTimer = setTimeout(flush, 1000);
    }
    return;
  }
  try {
    for (const metric of pending.splice(0)) send(sentry, metric);
  } catch {
    // ignore telemetry failures
  }
}

function reportToSentry(metric: VitalMetric) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  pending.push(metric);
  if (!flushTimer) flushTimer = setTimeout(flush, 0);
}

/** Reports LCP/CLS/INP/TTFB (and friends) to Sentry when configured. */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (!["CLS", "LCP", "INP", "TTFB", "FCP", "FID"].includes(metric.name)) return;
    reportToSentry(metric);
  });
  return null;
}
