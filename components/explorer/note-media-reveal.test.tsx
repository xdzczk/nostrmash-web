import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteMediaReveal, videoPreviewSrc } from "./note-media-reveal";

describe("NoteMediaReveal", () => {
  it("renders external media immediately without revealing a URL", () => {
    const { container } = render(
      <NoteMediaReveal url="https://media.example/image.jpg" kind="image" />
    );

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://media.example/image.jpg");
    expect(container.textContent).not.toMatch(/media\.example|https?:\/\//i);
  });

  it("renders videos with an early-frame media fragment", () => {
    const url = "https://media.example/clip.mp4";
    const { container } = render(<NoteMediaReveal url={url} kind="video" />);

    const video = container.querySelector("video");
    expect(video).toHaveAttribute("src", "https://media.example/clip.mp4#t=0.001");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(videoPreviewSrc(url)).toBe("https://media.example/clip.mp4#t=0.001");
    expect(videoPreviewSrc(`${url}#other`)).toBe("https://media.example/clip.mp4#t=0.001");
  });
});
