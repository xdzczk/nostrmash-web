import type { Metadata } from "next";

import { appConfig } from "@/lib/config";

export function absoluteUrl(pathname: string): string {
  const base = appConfig.siteUrl.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

/** Point a language-filtered Discover URL at the unfiltered page and keep it out of the index. */
export function withLanguageVariantMetadata(
  metadata: Metadata,
  lang: string | undefined,
  path: string
): Metadata {
  if (!lang) return metadata;
  return {
    ...metadata,
    robots: { index: false },
    alternates: {
      ...metadata.alternates,
      canonical: absoluteUrl(path),
    },
  };
}

export function buildEntityMetadata(input: {
  title: string;
  description: string;
  path: string;
  imagePath?: string;
  type?: "website" | "article" | "profile";
  rss?: { url: string; title: string };
}): Metadata {
  const url = absoluteUrl(input.path);
  const image = absoluteUrl(input.imagePath ?? "/opengraph-image");
  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: url,
      ...(input.rss
        ? {
            types: {
              "application/rss+xml": [{ url: input.rss.url, title: input.rss.title }],
            },
          }
        : {}),
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: appConfig.siteName,
      type: input.type === "article" ? "article" : "website",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}
