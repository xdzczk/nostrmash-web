/**
 * Public pages that are the same URL for every visitor. Workers Caching sits
 * in front of the Worker, so a hit never spends CPU. Unique pages stay
 * uncached and are limited separately at the edge.
 */
export const PUBLIC_EDGE_PATHS = new Set(["/", "/relays", "/methodology"]);

/** Shared cache for 60s, matching the homepage revalidate. Browsers recheck. */
export const PUBLIC_EDGE_CACHE_CONTROL =
  "public, s-maxage=60, max-age=0, stale-while-revalidate=60";

/**
 * Next document and RSC requests share a URL. Without these, a cached HTML
 * document would be served to a client navigation.
 */
const DOCUMENT_VARY = ["RSC", "Next-Router-Prefetch", "Next-Router-State-Tree"];

export function publicEdgeCacheHeaders(url: URL, response: Response): Headers | null {
  if (!PUBLIC_EDGE_PATHS.has(url.pathname)) return null;
  if (response.status !== 200) return null;
  // A Set-Cookie response is not safe to reuse, and Workers Caching would
  // bypass it anyway.
  if (response.headers.has("set-cookie")) return null;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", PUBLIC_EDGE_CACHE_CONTROL);

  const vary = new Set(
    (headers.get("Vary") ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
  );
  for (const name of DOCUMENT_VARY) vary.add(name);
  // `/` redirects from the nm_lang cookie when `lang` is absent. The query
  // string is already part of the cache key, so an explicit `lang` is shared.
  // A saved viewer is redirected onto `?viewer=` and is not varied here. The
  // bare document stays the global ranking; do not render it from the cookie.
  if (url.pathname === "/" && !url.searchParams.has("lang")) vary.add("Cookie");
  headers.set("Vary", [...vary].join(", "));
  return headers;
}
