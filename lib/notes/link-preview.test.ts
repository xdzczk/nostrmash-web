import { describe, expect, it } from "vitest";

import {
  assertSafePreviewUrl,
  mapFxTwitterPayload,
  parseLinkPreviewHtml,
} from "@/lib/notes/link-preview";

describe("link preview safety and parsing", () => {
  it("rejects private and non-https targets", () => {
    expect(() => assertSafePreviewUrl("http://example.com")).toThrow("https_required");
    expect(() => assertSafePreviewUrl("https://127.0.0.1/x")).toThrow("private_host");
    expect(() => assertSafePreviewUrl("https://localhost/x")).toThrow("private_host");
    expect(() => assertSafePreviewUrl("https://192.168.1.10/x")).toThrow("private_host");
    expect(assertSafePreviewUrl("https://example.com/path").hostname).toBe("example.com");
  });

  it("parses open graph metadata from html", () => {
    const html = `
      <html><head>
        <title>Fallback</title>
        <meta property="og:title" content="Hello &amp; World" />
        <meta property="og:description" content="A short summary" />
        <meta property="og:image" content="/img.png" />
        <meta property="og:site_name" content="Example" />
      </head></html>
    `;
    const preview = parseLinkPreviewHtml(html, new URL("https://www.example.com/page"));
    expect(preview).toEqual({
      url: "https://www.example.com/page",
      domain: "example.com",
      provider: "generic",
      title: "Hello & World",
      description: "A short summary",
      image_url: "https://www.example.com/img.png",
      site_name: "Example",
    });
  });

  it("maps fxtwitter status payloads into tweet previews", () => {
    const preview = mapFxTwitterPayload(
      {
        code: 200,
        tweet: {
          url: "https://x.com/jack/status/20",
          text: "just setting up my twttr",
          created_at: "Tue Mar 21 20:50:14 +0000 2006",
          author: {
            name: "jack",
            screen_name: "jack",
            avatar_url: "https://pbs.twimg.com/profile_images/a.jpg",
          },
          media: {
            photos: [{ url: "https://pbs.twimg.com/media/photo.jpg" }],
          },
        },
      },
      "https://x.com/jack/status/20"
    );

    expect(preview).toMatchObject({
      provider: "twitter",
      domain: "x.com",
      title: "jack (@jack)",
      description: "just setting up my twttr",
      image_url: "https://pbs.twimg.com/media/photo.jpg",
      tweet: {
        text: "just setting up my twttr",
        author_name: "jack",
        author_handle: "jack",
        avatar_url: "https://pbs.twimg.com/profile_images/a.jpg",
        media_url: "https://pbs.twimg.com/media/photo.jpg",
      },
    });
  });
});
