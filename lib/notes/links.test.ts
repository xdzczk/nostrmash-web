import { describe, expect, it } from "vitest";

import { extractNoteLinkUrls, stripNoteLinkPreviewUrls } from "@/lib/notes/links";

describe("note link helpers", () => {
  it("extracts non-media https links only", () => {
    const content =
      "See https://example.com/post and https://cdn.example/photo.jpg and http://insecure.example";
    expect(extractNoteLinkUrls(content, 2)).toEqual(["https://example.com/post"]);
  });

  it("strips preview candidate urls and host placeholders", () => {
    const raw = "Read https://bitcoin.org/about more";
    expect(stripNoteLinkPreviewUrls("Read [bitcoin.org] more", raw, 1)).toBe("Read more");
    expect(stripNoteLinkPreviewUrls(raw, raw, 1)).toBe("Read more");
  });
});
