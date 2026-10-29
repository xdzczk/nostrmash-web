import { describe, expect, it } from "vitest";

import { getMediaPresentation } from "@/lib/notes/media-event";

const PUBKEY = "b".repeat(64);

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
