import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ApiError, fetchApiJson } from "@/lib/api/http";
import {
  clampSuggestLimit,
  clampSuggestQuery,
  clientIpFromRequest,
} from "@/lib/api/search-suggest-params";
import { searchSuggestResponseSchema } from "@/lib/api/schemas/core";
import { nativeApiV1Routes } from "@/lib/api/endpoints/shared";

type RateLimiter = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};

async function enforceSuggestRateLimit(ip: string): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const limiter = (env as { SUGGEST_RATE_LIMITER?: RateLimiter }).SUGGEST_RATE_LIMITER;
    if (!limiter || typeof limiter.limit !== "function") {
      return true;
    }
    const result = await limiter.limit({ key: ip });
    return result.success;
  } catch {
    // Local `next dev` and non-Worker runtimes have no rate-limit binding.
    return true;
  }
}

export async function GET(request: NextRequest) {
  const q = clampSuggestQuery(request.nextUrl.searchParams.get("q") ?? "");
  const limit = clampSuggestLimit(request.nextUrl.searchParams.get("limit"));
  if (q.length < 2) {
    return NextResponse.json({ profiles: [], hashtags: [] });
  }

  const clientIp = clientIpFromRequest(request.headers);
  const allowed = await enforceSuggestRateLimit(clientIp);
  if (!allowed) {
    return NextResponse.json(
      { profiles: [], hashtags: [], error: { code: "rate_limited", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const body = await fetchApiJson(nativeApiV1Routes.searchSuggest, {
      cacheClass: "shortTtl",
      timeoutMs: 5_000,
      query: { q, limit },
      schema: searchSuggestResponseSchema,
      init: {
        headers: {
          "X-Forwarded-For": clientIp,
          "CF-Connecting-IP": clientIp,
        },
      },
    });

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=20" },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isRateLimited) {
        return NextResponse.json(
          {
            profiles: [],
            hashtags: [],
            error: {
              code: error.code ?? "rate_limited",
              message: "Upstream rate limited",
              request_id: error.requestId,
            },
          },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
      return NextResponse.json(
        {
          profiles: [],
          hashtags: [],
          error: {
            code: error.code ?? "upstream_error",
            message: "Suggest upstream failed",
            request_id: error.requestId,
          },
        },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
      );
    }
    return NextResponse.json({ profiles: [], hashtags: [] }, { status: 502 });
  }
}
