const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_SITE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://nostrmash.com";

export const appConfig = {
  siteName: "NostrMash",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
  apiBaseUrl: process.env.NOSTRMASH_API_BASE_URL ?? DEFAULT_API_BASE_URL,
};
