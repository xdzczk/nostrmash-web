import { describe, expect, it } from "vitest";

import {
  classifyNoteMediaUrl,
  extractNoteMediaAttachments,
  isNoteMediaUrl,
  stripNoteMediaUrls,
} from "@/lib/notes/media";

describe("note media helpers", () => {
  it("classifies common media extensions over https", () => {
    expect(classifyNoteMediaUrl("https://cdn.example/a.jpg")).toBe("image");
    expect(classifyNoteMediaUrl("https://cdn.example/a.mp4")).toBe("video");
    expect(classifyNoteMediaUrl("https://cdn.example/a.mp3")).toBe("audio");
    expect(classifyNoteMediaUrl("https://example.com/page")).toBeNull();
    expect(classifyNoteMediaUrl("http://cdn.example/a.jpg")).toBeNull();
  });

  it("extracts and strips media urls from note copy", () => {
    const content = "Hello https://cdn.example/pic.webp and https://example.com/docs";
    expect(extractNoteMediaAttachments(content)).toEqual([
      { url: "https://cdn.example/pic.webp", kind: "image" },
    ]);
    expect(isNoteMediaUrl("https://cdn.example/pic.webp")).toBe(true);
    expect(stripNoteMediaUrls(content)).toBe("Hello and https://example.com/docs");
  });
});
