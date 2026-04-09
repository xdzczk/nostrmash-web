const DEFAULT_API_BASE_URL = "http://localhost:8080";

export const appConfig = {
  siteName: "NostrMash",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  apiBaseUrl: process.env.NOSTRMASH_API_BASE_URL ?? DEFAULT_API_BASE_URL,
};
