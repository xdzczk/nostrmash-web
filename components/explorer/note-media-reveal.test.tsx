import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { NoteMediaReveal, videoPreviewSrc } from "./note-media-reveal";

describe("NoteMediaReveal", () => {
  it("renders external media immediately without revealing a URL", () => {
    const { container } = render(
      <NoteMediaReveal url="https://media.example/image.jpg" kind="image" />
    );

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://media.example/image.jpg");
    expect(container.querySelector("a[target='_blank']")).toBeNull();
    expect(container.textContent).not.toMatch(/media\.example|https?:\/\//i);
  });

  it("enlarges note photos in a lightbox instead of a new tab", async () => {
    const user = userEvent.setup();
    render(<NoteMediaReveal url="https://media.example/image.jpg" kind="image" />);

    await user.click(screen.getByRole("button", { name: /enlarge image attached to note/i }));
    expect(screen.getByRole("dialog", { name: "Image attached to note" })).toBeInTheDocument();
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
