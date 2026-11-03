import { describe, expect, it } from "vitest";

import { extractImetaAttachments, getMediaPresentation } from "@/lib/notes/media-event";

const PUBKEY = "b".repeat(64);

describe("extractImetaAttachments", () => {
  it("reads an extensionless image from its mime type", () => {
    expect(
      extractImetaAttachments([
        ["imeta", "url https://blossom.example/abc", "m image/jpeg", "alt Harbor"],
      ])
    ).toEqual([{ url: "https://blossom.example/abc", kind: "image", alt: "Harbor" }]);
  });

  it("keeps a YouTube video when the imeta mime describes the thumbnail", () => {
    expect(
      extractImetaAttachments([
        [
          "imeta",
          "url https://www.youtube.com/watch?v=H02x_Vpqh9c",
          "image https://i.ytimg.com/vi/H02x_Vpqh9c/hqdefault.jpg",
          "m image/jpeg",
        ],
      ])
    ).toEqual([{ url: "https://www.youtube.com/watch?v=H02x_Vpqh9c", kind: "video" }]);
  });

  it("keeps a video without also attaching its poster", () => {
    expect(
      extractImetaAttachments([
        [
          "imeta",
          "url https://media.example.invalid/cliff.mp4",
          "m video/mp4",
          "image https://media.example.invalid/cliff.jpg",
        ],
      ])
    ).toEqual([{ url: "https://media.example.invalid/cliff.mp4", kind: "video" }]);
  });
});

describe("getMediaPresentation", () => {
  it("reads a picture caption and imeta image", () => {
    const presentation = getMediaPresentation({
      id: "a".repeat(64),
      pubkey: PUBKEY,
      kind: 20,
      content: "Harbor at dusk",
      tags: [
        ["title", "Harbor light"],
        ["imeta", "url https://media.example.invalid/harbor.jpg", "m image/jpeg", "alt Harbor"],
      ],
    });
    expect(presentation?.variant).toBe("picture");
    expect(presentation?.title).toBe("Harbor light");
    expect(presentation?.text).toBe("Harbor at dusk");
    expect(presentation?.images[0]?.url).toBe("https://media.example.invalid/harbor.jpg");
    expect(presentation?.images[0]?.alt).toBe("Harbor");
    expect(presentation?.videoUrl).toBeUndefined();
  });

  it("treats a short video as a vertical clip with a poster", () => {
    const presentation = getMediaPresentation({
      id: "b".repeat(64),
      pubkey: PUBKEY,
      kind: 22,
      content: "A short vertical clip",
      tags: [
        ["title", "Cliff path"],
        [
          "imeta",
          "url https://media.example.invalid/cliff.mp4",
          "m video/mp4",
          "image https://media.example.invalid/cliff.jpg",
        ],
        ["duration", "12"],
      ],
    });
    expect(presentation?.variant).toBe("short");
    expect(presentation?.videoUrl).toBe("https://media.example.invalid/cliff.mp4");
    expect(presentation?.posterUrl).toBe("https://media.example.invalid/cliff.jpg");
    expect(presentation?.durationLabel).toBe("0:12");
  });

  it("plays a YouTube watch URL and keeps the thumbnail as the poster", () => {
    const presentation = getMediaPresentation({
      id: "d".repeat(64),
      pubkey: PUBKEY,
      kind: 21,
      content: "Watch the episode",
      tags: [
        ["title", "Tuttle Twins"],
        [
          "imeta",
          "url https://www.youtube.com/watch?v=H02x_Vpqh9c",
          "image https://i.ytimg.com/vi/H02x_Vpqh9c/hqdefault.jpg",
          "m image/jpeg",
        ],
      ],
    });
    expect(presentation?.variant).toBe("video");
    expect(presentation?.videoUrl).toBe("https://www.youtube.com/watch?v=H02x_Vpqh9c");
    expect(presentation?.posterUrl).toBe("https://i.ytimg.com/vi/H02x_Vpqh9c/hqdefault.jpg");
    expect(presentation?.images.map((image) => image.url)).not.toContain(
      "https://www.youtube.com/watch?v=H02x_Vpqh9c"
    );
  });

  it("keeps a video file when its cover is tagged with an image mime", () => {
    const presentation = getMediaPresentation({
      id: "e".repeat(64),
      pubkey: PUBKEY,
      kind: 21,
      content: "A hosted video",
      tags: [
        [
          "imeta",
          "url https://media.example.invalid/episode.mp4",
          "m image/jpeg",
          "image https://media.example.invalid/episode.jpg",
        ],
      ],
    });
    expect(presentation?.videoUrl).toBe("https://media.example.invalid/episode.mp4");
    expect(presentation?.posterUrl).toBe("https://media.example.invalid/episode.jpg");
  });

  it("builds an naddr for an addressable video", () => {
    const presentation = getMediaPresentation({
      id: "c".repeat(64),
      pubkey: PUBKEY,
      kind: 34236,
      content: "Addressable short",
      tags: [
        ["d", "cliff"],
        ["url", "https://media.example.invalid/cliff.mp4"],
      ],
    });
    expect(presentation?.variant).toBe("short");
    expect(presentation?.address).toEqual({ kind: 34236, pubkey: PUBKEY, identifier: "cliff" });
    expect(presentation?.naddr?.startsWith("naddr1")).toBe(true);
  });
});
