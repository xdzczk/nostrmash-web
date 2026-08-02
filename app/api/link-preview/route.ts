import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { clientIpFromRequest } from "@/lib/api/search-suggest-params";
import { assertSafePreviewUrl, fetchLinkPreview } from "@/lib/notes/link-preview";
import { isNoteMediaUrl } from "@/lib/notes/media";

type RateLimiter = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};

async function enforceLinkPreviewRateLimit(ip: string): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const limiter = (env as { SUGGEST_RATE_LIMITER?: RateLimiter }).SUGGEST_RATE_LIMITER;
    if (!limiter || typeof limiter.limit !== "function") {
      return true;
    }
    const result = await limiter.limit({ key: `link-preview:${ip}` });
    return result.success;
  } catch {
    return true;
  }
}

function errorResponse(code: string, status: number, cacheSeconds: number) {
  return NextResponse.json(
    { error: code },
    {
      status,
      headers: {
        "Cache-Control": `public, max-age=0, s-maxage=${cacheSeconds}`,
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") ?? "";
  let sanitized: string;
  try {
    sanitized = assertSafePreviewUrl(raw).toString();
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_url";
    return errorResponse(code, 400, 300);
  }

  if (isNoteMediaUrl(sanitized)) {
    return errorResponse("media_url", 400, 300);
  }

  const clientIp = clientIpFromRequest(request.headers);
  const allowed = await enforceLinkPreviewRateLimit(clientIp);
  if (!allowed) {
    return errorResponse("rate_limited", 429, 30);
  }

  try {
    const preview = await fetchLinkPreview(sanitized);
    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    // Domain-only fallback so the UI can still render a quiet card.
    try {
      const url = assertSafePreviewUrl(sanitized);
      return NextResponse.json(
        {
          url: url.toString(),
          domain: url.hostname.toLowerCase().replace(/^www\./, ""),
          provider: "generic",
        },
        {
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
          },
        }
      );
    } catch {
      return errorResponse("fetch_failed", 502, 60);
    }
  }
}
