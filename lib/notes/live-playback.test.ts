import { describe, expect, it } from "vitest";

import { classifyStreamUrl, preferPlayableStream } from "@/lib/notes/live-playback";

describe("classifyStreamUrl", () => {
  it("recognizes HLS playlists", () => {
    expect(classifyStreamUrl("https://media.example/live.m3u8")).toEqual({
      kind: "hls",
      url: "https://media.example/live.m3u8",
    });
    expect(classifyStreamUrl("https://cdn.example/hls/abc/index.m3u8?token=1").kind).toBe("hls");
    expect(classifyStreamUrl("https://radio.example/live?format=m3u8").kind).toBe("hls");
  });

  it("recognizes progressive files and YouTube", () => {
    expect(classifyStreamUrl("https://media.example/show.mp4")).toMatchObject({
      kind: "file",
      media: "video",
    });
    expect(classifyStreamUrl("https://media.example/show.mp3")).toMatchObject({
      kind: "file",
      media: "audio",
    });
    expect(classifyStreamUrl("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({
      kind: "youtube",
      videoId: "dQw4w9WgXcQ",
    });
    expect(classifyStreamUrl("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ").kind).toBe(
      "youtube"
    );
  });

  it("leaves pages and non-https URLs external", () => {
    expect(classifyStreamUrl("https://zap.stream/naddr1example").kind).toBe("external");
    expect(classifyStreamUrl("http://media.example/live.m3u8").kind).toBe("external");
    expect(classifyStreamUrl("moq://relay.example").kind).toBe("external");
    expect(classifyStreamUrl("not a url").kind).toBe("external");
  });
});

describe("preferPlayableStream", () => {
  it("prefers an HLS URL over MOQ, YouTube, and a web page", () => {
    expect(
      preferPlayableStream([
        "moq://api.example:1443/",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://api.example/hls/live.m3u8",
        "https://zap.stream/watch",
      ])
    ).toBe("https://api.example/hls/live.m3u8");
  });

  it("falls back to the first https URL when nothing is playable inline", () => {
    expect(preferPlayableStream(["moq://relay.example", "https://example.com/watch"])).toBe(
      "https://example.com/watch"
    );
    expect(preferPlayableStream(["http://media.example/live.m3u8"])).toBeUndefined();
  });
});
