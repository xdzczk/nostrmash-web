import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/video-frame/route";
import type * as VideoPreview from "@/lib/media/video-preview";

const PREVIEW = Uint8Array.from([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

vi.mock("@/lib/media/video-preview", async (original) => ({
  ...(await original<typeof VideoPreview>()),
  planMoovFetch: () => ({ kind: "ready" }),
  locatePreviewSample: () => ({
    offset: 0,
    size: 4,
    width: 16,
    height: 16,
    timescale: 1000,
    duration: 40,
    sampleEntry: new Uint8Array(0),
  }),
  buildPreviewMp4: () => PREVIEW,
}));

const FRAME_URL = "https://nostrmash.com/video-frame?src=https%3A%2F%2Fcdn.example%2Fa.mp4";

function stubVideoSource() {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(Uint8Array.from([1, 2, 3, 4]), {
          status: 206,
          headers: { "content-type": "video/mp4", "content-range": "bytes 0-3/4" },
        })
    )
  );
}

async function frame(range?: string) {
  const response = await GET(new Request(FRAME_URL, range ? { headers: { range } } : undefined));
  return { response, bytes: [...new Uint8Array(await response.arrayBuffer())] };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("video frame route", () => {
  it("rejects a private host", async () => {
    const response = await GET(
      new Request("https://nostrmash.com/video-frame?src=https%3A%2F%2F127.0.0.1%2Fa.mp4")
    );
    expect(response.status).toBe(400);
  });

  it("does not follow a source that is not a video index", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response("nope", { status: 200, headers: { "content-type": "text/html" } })
      )
    );
    const response = await GET(new Request(FRAME_URL));
    expect(response.status).toBe(404);
  });

  it("serves the whole preview when no range is asked for", async () => {
    stubVideoSource();
    const { response, bytes } = await frame();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-length")).toBe("10");
    expect(bytes).toEqual([...PREVIEW]);
  });

  it("answers the two-byte probe Safari sends before it plays a video", async () => {
    stubVideoSource();
    const { response, bytes } = await frame("bytes=0-1");
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-1/10");
    expect(response.headers.get("content-length")).toBe("2");
    expect(bytes).toEqual([10, 11]);
  });

  it("serves the tail of the preview for an open range", async () => {
    stubVideoSource();
    const { response, bytes } = await frame("bytes=6-");
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 6-9/10");
    expect(bytes).toEqual([16, 17, 18, 19]);
  });

  it("reports the preview size for a range past its end", async () => {
    stubVideoSource();
    const { response } = await frame("bytes=10-");
    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */10");
  });
});
