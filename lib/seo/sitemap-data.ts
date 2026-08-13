import { absoluteUrl } from "@/lib/seo/metadata";
import type { MetadataRoute } from "next";

/**
 * Intentionally limited to the bounded, static surface of the app.
 *
 * Per-entity pages (notes/profiles/hashtags/domains by id) are NOT listed
 * here: the trending set rotates constantly, so advertising them turns the
 * sitemap into a self-refreshing feed of "new" URLs that keeps crawlers
 * coming back to walk an effectively unbounded id space. Every one of those
 * visits fans out into several cached API calls, which is what drove this
 * app's R2 write-operation bill far above what real traffic ever justified.
 * Entity pages can still be discovered organically via on-page links; they
 * just aren't force-fed to crawlers.
 */
const STATIC_PATHS = [
  "/",
  "/search",
  "/trending/notes",
  "/trending/profiles",
  "/trending/hashtags",
  "/trending/domains",
  "/trending/long-form",
  "/stats",
  "/relays",
  "/relays/health",
  "/relays/popular",
  "/methodology",
  "/discovery/conversations/hot",
  "/discovery/profiles/rising",
];

export async function buildSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  return STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
