import { NextResponse } from "next/server";

import { DISPLAY_IMAGE_WIDTH } from "@/lib/media/display-image";
import { assertSafePreviewUrl } from "@/lib/notes/link-preview";

const MAX_BYTES = 1_500_000;

type ImageFetchInit = RequestInit & {
  cf?: {
    image?: { width: number; quality: number; fit: string; format: string };
    cacheTtl?: number;
  };
};

function cacheStore(): Cache | null {
  const cachesWithDefault = globalThis.caches as CacheStorage & { default?: Cache };
  return cachesWithDefault?.default ?? null;
}

function redirectTo(target: URL): NextResponse {
  const response = NextResponse.redirect(target, 302);
  response.headers.set("cache-control", "public, max-age=300");
  return response;
}

/**
 * 96px display images for avatars and compact thumbnails. A failed transform
 * redirects to the original so the picture still loads.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const width = Number(url.searchParams.get("w"));
  if (width !== DISPLAY_IMAGE_WIDTH) {
    return new NextResponse("Bad width", { status: 400 });
  }

  let target: URL;
  try {
    target = assertSafePreviewUrl(url.searchParams.get("src") ?? "");
  } catch {
    return new NextResponse("Bad url", { status: 400 });
  }
  if (target.pathname === "/img") {
    return new NextResponse("Bad url", { status: 400 });
  }

  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = cacheStore();
  const cached = await cache?.match(cacheKey).catch(() => undefined);
  if (cached) return cached;

  let upstream: Response;
  try {
    const init: ImageFetchInit = {
      redirect: "follow",
      headers: { accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      cf: {
        image: { width, quality: 75, fit: "scale-down", format: "auto" },
        cacheTtl: 60 * 60 * 24,
      },
    };
    upstream = await fetch(target, init);
  } catch {
    return redirectTo(target);
  }

  const type = upstream.headers.get("content-type") ?? "";
  const length = Number(upstream.headers.get("content-length") ?? "0");
  if (!upstream.ok || !type.startsWith("image/") || length > MAX_BYTES || !upstream.body) {
    return redirectTo(target);
  }

  const reader = upstream.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      return redirectTo(target);
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const response = new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=86400, s-maxage=604800",
      "x-content-type-options": "nosniff",
    },
  });
  await cache?.put(cacheKey, response.clone()).catch(() => undefined);
  return response;
}
