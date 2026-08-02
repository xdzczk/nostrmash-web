import { describe, expect, it } from "vitest";

import {
  classifyEmbedUrl,
  parseTwitterStatusId,
  parseYoutubeVideoId,
  youtubeEmbedSrc,
} from "@/lib/notes/embeds";

describe("note embeds", () => {
  it("parses youtube video ids from common shapes", () => {
    expect(parseYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYoutubeVideoId("http://youtu.be/dQw4w9WgXcQ")).toBeNull();
  });

  it("parses twitter/x status ids", () => {
    expect(parseTwitterStatusId("https://x.com/jack/status/20")).toBe("20");
    expect(parseTwitterStatusId("https://twitter.com/jack/status/20")).toBe("20");
    expect(parseTwitterStatusId("https://mobile.twitter.com/jack/statuses/20")).toBe("20");
    expect(parseTwitterStatusId("https://x.com/jack")).toBeNull();
    expect(parseTwitterStatusId("https://example.com/status/20")).toBeNull();
  });

  it("classifies embed providers", () => {
    expect(classifyEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube");
    expect(classifyEmbedUrl("https://x.com/a/status/1")).toBe("twitter");
    expect(classifyEmbedUrl("https://example.com/post")).toBe("generic");
  });

  it("builds privacy-enhanced youtube embed urls", () => {
    expect(youtubeEmbedSrc("dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0"
    );
  });
});
