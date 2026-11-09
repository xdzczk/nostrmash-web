import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/video-frame/route";

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
    const response = await GET(
      new Request("https://nostrmash.com/video-frame?src=https%3A%2F%2Fcdn.example%2Fa.mp4")
    );
    expect(response.status).toBe(404);
  });
});
