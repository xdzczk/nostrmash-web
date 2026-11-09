import { NextResponse } from "next/server";

import {
  buildPreviewMp4,
  locatePreviewSample,
  planMoovFetch,
  VIDEO_PREVIEW_HEAD_BYTES,
  VIDEO_PREVIEW_MAX_MOOV,
  VIDEO_PREVIEW_MAX_SAMPLE,
} from "@/lib/media/video-preview";
import { assertSafePreviewUrl } from "@/lib/notes/link-preview";

type RangeBody = { bytes: Uint8Array; total: number; type: string };

function cacheStore(): Cache | null {
  const cachesWithDefault = globalThis.caches as CacheStorage & { default?: Cache };
  return cachesWithDefault?.default ?? null;
}

function fileSize(header: string | null, fallback: number): number {
  const match = /\/(\d+)\s*$/.exec(header ?? "");
  const parsed = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function acceptableType(type: string): boolean {
  if (!type) return true;
  return (
    type.startsWith("video/") ||
    type.startsWith("application/octet-stream") ||
    type.startsWith("binary/")
  );
}

async function readRange(
  url: URL,
  start: number,
  end: number,
  max: number
): Promise<RangeBody | null> {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start + 1 > max) {
    return null;
  }
  const response = await fetch(url, {
    redirect: "follow",
    headers: { range: `bytes=${start}-${end}`, accept: "video/mp4,video/*,*/*" },
  });
  const type =
    (response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if ((!response.ok && response.status !== 206) || !acceptableType(type) || !response.body) {
    return null;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const declared = fileSize(response.headers.get("content-range"), bytes.length);
  return { bytes, total: Math.max(declared, end + 1), type };
}

function missing(): NextResponse {
  return new NextResponse(null, {
    status: 404,
    headers: { "cache-control": "public, max-age=60" },
  });
}

/**
 * A one-frame MP4 for a remote video. The original file stays unloaded until
 * someone presses play.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  let target: URL;
  try {
    target = assertSafePreviewUrl(url.searchParams.get("src") ?? "");
  } catch {
    return new NextResponse("Bad url", { status: 400 });
  }
  if (target.pathname === "/video-frame" || target.pathname === "/img") {
    return new NextResponse("Bad url", { status: 400 });
  }

  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = cacheStore();
  const cached = await cache?.match(cacheKey).catch(() => undefined);
  if (cached) return cached;

  try {
    const head = await readRange(target, 0, VIDEO_PREVIEW_HEAD_BYTES - 1, VIDEO_PREVIEW_HEAD_BYTES);
    if (!head) return missing();
    const plan = planMoovFetch(head.bytes, head.total);
    if (plan.kind === "missing") return missing();
    const moov =
      plan.kind === "ready"
        ? head.bytes
        : (
            await readRange(
              target,
              plan.start,
              plan.end,
              Math.min(VIDEO_PREVIEW_MAX_MOOV, plan.end - plan.start + 1)
            )
          )?.bytes;
    if (!moov) return missing();
    const located = locatePreviewSample(moov);
    if (!located || located.size > VIDEO_PREVIEW_MAX_SAMPLE) return missing();
    const sample = await readRange(
      target,
      located.offset,
      located.offset + located.size - 1,
      located.size
    );
    if (!sample || sample.bytes.length < located.size) return missing();
    const preview = buildPreviewMp4(sample.bytes.subarray(0, located.size), located);
    // A fresh ArrayBuffer satisfies BodyInit. A Uint8Array view of a shared
    // or pooled buffer does not.
    const body = new ArrayBuffer(preview.byteLength);
    new Uint8Array(body).set(preview);
    const response = new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "video/mp4",
        "cache-control": "public, max-age=86400, s-maxage=604800",
        "x-content-type-options": "nosniff",
      },
    });
    await cache?.put(cacheKey, response.clone()).catch(() => undefined);
    return response;
  } catch {
    return missing();
  }
}
