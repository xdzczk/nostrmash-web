import { describe, expect, it } from "vitest";

import { videoFrameCacheResponse } from "./video-frame-cache";

describe("videoFrameCacheResponse", () => {
  it("gives a preview a length and drops the document vary", async () => {
    const response = await videoFrameCacheResponse(
      new Response(Uint8Array.from([1, 2, 3, 4]), {
        status: 200,
        headers: {
          "content-type": "video/mp4",
          vary: "RSC, Next-Router-Prefetch",
          "content-encoding": "gzip",
        },
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("vary")).toBeNull();
    expect(response.headers.get("content-encoding")).toBeNull();
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3, 4]);
  });

  it("leaves an error response untouched", async () => {
    const response = await videoFrameCacheResponse(new Response(null, { status: 404 }));
    expect(response.status).toBe(404);
    expect(response.headers.get("content-length")).toBeNull();
  });
});
