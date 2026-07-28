import type { NextRequest } from "next/server";

import { appConfig } from "@/lib/config";
import { absoluteUrl } from "@/lib/seo/metadata";

function parseNoteUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const site = new URL(appConfig.siteUrl);
    if (url.hostname !== site.hostname && url.hostname !== "localhost") {
      // Allow same-site and local preview hosts only.
      if (!url.hostname.endsWith(site.hostname) && url.hostname !== "127.0.0.1") {
        return null;
      }
    }
    const match = url.pathname.match(/^\/notes\/([^/]+)\/?$/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url") ?? "";
  const eventId = parseNoteUrl(urlParam);
  if (!eventId) {
    return Response.json(
      { error: "invalid_url", message: "Provide a NostrMash note URL." },
      { status: 400 }
    );
  }

  const maxwidth = Number(request.nextUrl.searchParams.get("maxwidth") ?? "560");
  const width = Number.isFinite(maxwidth) ? Math.min(Math.max(maxwidth, 280), 800) : 560;
  const height = 220;
  const src = absoluteUrl(`/embed/notes/${encodeURIComponent(eventId)}`);
  const html = `<iframe src="${src}" width="${width}" height="${height}" style="border:0;border-radius:12px;overflow:hidden;max-width:100%" loading="lazy" allowfullscreen></iframe>`;

  return Response.json(
    {
      version: "1.0",
      type: "rich",
      provider_name: appConfig.siteName,
      provider_url: appConfig.siteUrl,
      width,
      height,
      html,
      url: absoluteUrl(`/notes/${encodeURIComponent(eventId)}`),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}
