import { NextResponse } from "next/server";

import { resolveByteRange } from "@/lib/media/byte-range";
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

const PREVIEW_HEADERS = {
  "content-type": "video/mp4",
  "cache-control": "public, max-age=86400, s-maxage=604800",
  "accept-ranges": "bytes",
  "x-content-type-options": "nosniff",
};

/**
 * Safari probes a video with `Range: bytes=0-1` and gives up on any answer
 * other than 206, so the preview has to be served in the ranges it asks for.
 */
function previewResponse(body: ArrayBuffer, rangeHeader: string | null): NextResponse {
  const total = body.byteLength;
  const range = resolveByteRange(rangeHeader, total);
  if (range === "unsatisfiable") {
    return new NextResponse(null, {
      status: 416,
      headers: { "content-range": `bytes */${total}`, "accept-ranges": "bytes" },
    });
  }
  if (!range) {
    return new NextResponse(body, {
      status: 200,
      headers: { ...PREVIEW_HEADERS, "content-length": String(total) },
    });
  }
  const part = body.slice(range.start, range.end + 1);
  return new NextResponse(part, {
    status: 206,
    headers: {
      ...PREVIEW_HEADERS,
      "content-range": `bytes ${range.start}-${range.end}/${total}`,
      "content-length": String(part.byteLength),
    },
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

  // The cache holds the whole preview. Each request is cut from it, so a
  // ranged request never stores or returns a partial body under this key.
  const rangeHeader = request.headers.get("range");
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = cacheStore();
  const cached = await cache?.match(cacheKey).catch(() => undefined);
  if (cached) {
    const stored = await cached.arrayBuffer().catch(() => null);
    if (stored && stored.byteLength > 0) return previewResponse(stored, rangeHeader);
  }

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
    await cache?.put(cacheKey, previewResponse(body, null)).catch(() => undefined);
    return previewResponse(body, rangeHeader);
  } catch {
    return missing();
  }
}
