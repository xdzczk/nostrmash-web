import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteMediaReveal } from "./note-media-reveal";

describe("NoteMediaReveal", () => {
  it("renders external media immediately without revealing a URL", () => {
    const { container } = render(
      <NoteMediaReveal url="https://media.example/image.jpg" kind="image" />
    );

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://media.example/image.jpg");
    expect(container.textContent).not.toMatch(/media\.example|https?:\/\//i);
  });
});
