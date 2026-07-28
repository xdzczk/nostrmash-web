import { z } from "zod";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_SITE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://nostrmash.com";

const envSchema = z.object({
  NOSTRMASH_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

function isProductionRuntime(): boolean {
  // `next build` sets NODE_ENV=production, but page data collection still imports this module.
  // Fail closed only for real production runtimes (Workers / `next start`), not the build phase.
  return (
    process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build"
  );
}

function resolveConfig() {
  const parsed = envSchema.safeParse({
    NOSTRMASH_API_BASE_URL: process.env.NOSTRMASH_API_BASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    if (isProductionRuntime()) {
      throw new Error(`Invalid environment configuration: ${message}`);
    }
    console.warn(`[config] Invalid environment configuration: ${message}`);
  }

  const apiBaseUrl =
    parsed.success && parsed.data.NOSTRMASH_API_BASE_URL
      ? parsed.data.NOSTRMASH_API_BASE_URL
      : process.env.NOSTRMASH_API_BASE_URL;

  const siteUrl =
    parsed.success && parsed.data.NEXT_PUBLIC_SITE_URL
      ? parsed.data.NEXT_PUBLIC_SITE_URL
      : process.env.NEXT_PUBLIC_SITE_URL;

  if (isProductionRuntime() && !apiBaseUrl) {
    throw new Error(
      "NOSTRMASH_API_BASE_URL is required in production and must be a valid absolute URL."
    );
  }

  return {
    siteName: "NostrMash",
    siteUrl: siteUrl ?? DEFAULT_SITE_URL,
    apiBaseUrl: apiBaseUrl ?? DEFAULT_API_BASE_URL,
  };
}

export const appConfig = resolveConfig();
