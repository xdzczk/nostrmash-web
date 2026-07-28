import type { MetadataRoute } from "next";

import { appConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = appConfig.siteUrl.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/embed/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
