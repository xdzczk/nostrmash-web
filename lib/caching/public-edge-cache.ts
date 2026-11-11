import { RANKING_PATHS, VIEWER_ONLY_PATHS } from "@/lib/routing/ranking-paths";

/**
 * Public pages that are the same URL for every visitor. Workers Caching sits
 * in front of the Worker, so a hit never spends CPU.
 *
 * Shared pages (rankings, stats, search) stay fresh for 60s. Entity pages are
 * fetched again and again by crawlers and can be a few minutes stale, so they
 * stay cached longer. Personal and API routes stay uncached.
 */
const SHARED_EXACT_PATHS = new Set([
  ...RANKING_PATHS,
  "/relays",
  "/relays/health",
  "/relays/popular",
  "/methodology",
  "/stats",
  "/search",
]);

const ENTITY_PREFIXES = ["/notes/", "/profiles/", "/hashtags/", "/domains/", "/relays/"];

/** Shared cache for 60s, matching the homepage revalidate. Browsers recheck. */
export const PUBLIC_EDGE_CACHE_CONTROL =
  "public, s-maxage=60, max-age=0, stale-while-revalidate=60";

/** Entity pages change slower than a ranking and are refetched within minutes. */
export const ENTITY_EDGE_CACHE_CONTROL =
  "public, s-maxage=600, max-age=0, stale-while-revalidate=600";

/**
 * Next document and RSC requests share a URL. Without these, a cached HTML
 * document would be served to a client navigation.
 */
const DOCUMENT_VARY = ["RSC", "Next-Router-Prefetch", "Next-Router-State-Tree"];

function cacheControlFor(pathname: string): string | null {
  if (SHARED_EXACT_PATHS.has(pathname) || pathname.startsWith("/stats/")) {
    return PUBLIC_EDGE_CACHE_CONTROL;
  }
  if (ENTITY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return ENTITY_EDGE_CACHE_CONTROL;
  }
  return null;
}

/**
 * A 200 rendered without the cookie's param must not be reused for a visitor
 * whose cookie would have redirected them onto that param.
 */
function variesOnCookie(url: URL): boolean {
  const path = url.pathname;
  if (VIEWER_ONLY_PATHS.has(path)) return !url.searchParams.has("viewer");
  if (RANKING_PATHS.has(path) || path === "/search") return !url.searchParams.has("lang");
  return false;
}

export function publicEdgeCacheHeaders(url: URL, response: Response): Headers | null {
  const cacheControl = cacheControlFor(url.pathname);
  if (!cacheControl) return null;
  if (response.status !== 200) return null;
  // A Set-Cookie response is not safe to reuse, and Workers Caching would
  // bypass it anyway.
  if (response.headers.has("set-cookie")) return null;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", cacheControl);

  const vary = new Set(
    (headers.get("Vary") ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
  );
  for (const name of DOCUMENT_VARY) vary.add(name);
  // The query string is already part of the cache key, so an explicit `lang`
  // or `viewer` is shared. A saved cookie is redirected onto the URL and is
  // not varied once that param is present. The bare document stays the global
  // ranking; do not render it from the cookie.
  if (variesOnCookie(url)) vary.add("Cookie");
  headers.set("Vary", [...vary].join(", "));
  return headers;
}
