import { describe, expect, it } from "vitest";

import { displayImageSrc } from "@/lib/media/display-image";

describe("displayImageSrc", () => {
  it("routes small remote images through the resizer", () => {
    expect(displayImageSrc("https://cdn.example/ada.jpg", 44)).toBe(
      "/img?src=https%3A%2F%2Fcdn.example%2Fada.jpg&w=96"
    );
  });

  it("leaves large and non-https sources alone", () => {
    expect(displayImageSrc("https://cdn.example/wide.jpg", 640)).toBe(
      "https://cdn.example/wide.jpg"
    );
    expect(displayImageSrc("data:image/svg+xml,abc", 40)).toBe("data:image/svg+xml,abc");
    expect(displayImageSrc("/icon.png", 40)).toBe("/icon.png");
  });
});
