"use client";

import { useReportWebVitals } from "next/web-vitals";

type MetricName = "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";

function reportToSentry(metric: { name: string; value: number; id: string; rating?: string }) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    // Lazy require keeps the island importable when Sentry is disabled.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs") as {
      metrics?: { distribution?: (name: string, value: number, options?: object) => void };
      addBreadcrumb?: (breadcrumb: {
        category?: string;
        message?: string;
        level?: "info";
        data?: Record<string, unknown>;
      }) => void;
    };
    const name = metric.name as MetricName;
    if (typeof Sentry.metrics?.distribution === "function") {
      Sentry.metrics.distribution(`web_vital.${name.toLowerCase()}`, metric.value, {
        unit: name === "CLS" ? "none" : "millisecond",
        tags: { rating: metric.rating ?? "unknown" },
      });
      return;
    }
    Sentry.addBreadcrumb?.({
      category: "web-vital",
      message: `${name}=${metric.value}`,
      level: "info",
      data: { id: metric.id, rating: metric.rating },
    });
  } catch {
    // ignore telemetry failures
  }
}

/** Reports LCP/CLS/INP/TTFB (and friends) to Sentry when configured. */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (!["CLS", "LCP", "INP", "TTFB", "FCP", "FID"].includes(metric.name)) return;
    reportToSentry(metric);
  });
  return null;
}
