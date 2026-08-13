import type { MetadataRoute } from "next";

import { appConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = appConfig.siteUrl.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        // Per-entity routes (notes/profiles/hashtags/domains/relay hosts, and
        // their feed equivalents) key off an effectively unbounded id space.
        // Letting crawlers walk them turned every crawl into a wave of cached
        // API calls that dominated our R2 write-operation bill. Keep the
        // bounded, static surface allowed; block the rest until launch.
        allow: ["/", "/relays/health", "/relays/popular", "/relays/probe-health"],
        disallow: [
          "/api/",
          "/embed/",
          "/notes/",
          "/profiles/",
          "/hashtags/",
          "/domains/",
          "/relays/",
          "/feeds/hashtags/",
          "/feeds/profiles/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
