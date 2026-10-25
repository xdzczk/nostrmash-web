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

  it("lazy-loads by default and eager-loads priority media", () => {
    const { container, rerender } = render(
      <NoteMediaReveal url="https://media.example/image.jpg" kind="image" />
    );
    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");

    rerender(<NoteMediaReveal url="https://media.example/image.jpg" kind="image" priority />);
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
  });

  it("keeps profile feed photos at their own aspect ratio", () => {
    const { container } = render(
      <NoteMediaReveal url="https://media.example/image.jpg" kind="image" variant="feed" />
    );
    const image = container.querySelector("img");
    expect(image).toHaveClass("max-h-[28rem]");
    expect(image).toHaveClass("max-w-full");
    expect(image).toHaveClass("w-auto");
    expect(image).toHaveClass("object-contain");
    expect(image).not.toHaveClass("w-full");
    expect(image).not.toHaveClass("aspect-square");
  });

  it("keeps focal and reply photos at their own aspect ratio", () => {
    const { container, rerender } = render(
      <NoteMediaReveal url="https://media.example/image.jpg" kind="image" variant="detail" />
    );
    expect(container.querySelector("img")).toHaveClass("max-h-[min(44rem,78vh)]");
    expect(container.querySelector("img")).toHaveClass("w-auto");
    expect(container.querySelector("img")).toHaveClass("object-contain");

    rerender(
      <NoteMediaReveal url="https://media.example/image.jpg" kind="image" variant="thread" />
    );
    expect(container.querySelector("img")).toHaveClass("max-h-48");
    expect(container.querySelector("img")).toHaveClass("object-contain");
    expect(container.querySelector("img")).not.toHaveClass("w-full");
  });

  it("shows a +N badge for attachments hidden by the compact variant", () => {
    render(
      <NoteMediaReveal
        url="https://media.example/image.jpg"
        kind="image"
        variant="compact"
        hiddenCount={2}
      />
    );
    expect(screen.getByLabelText("2 more attachments")).toHaveTextContent("+2");
  });

  it("renders videos with an early-frame media fragment", () => {
    const url = "https://media.example/clip.mp4";
    const { container } = render(<NoteMediaReveal url={url} kind="video" />);

    const video = container.querySelector("video");
    expect(video).toHaveAttribute("src", "https://media.example/clip.mp4#t=0.001");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).toHaveClass("object-contain");
    expect(videoPreviewSrc(url)).toBe("https://media.example/clip.mp4#t=0.001");
    expect(videoPreviewSrc(`${url}#other`)).toBe("https://media.example/clip.mp4#t=0.001");
  });

  it("letterboxes lead videos instead of cropping the frame", () => {
    const { container } = render(
      <NoteMediaReveal url="https://media.example/clip.mp4" kind="video" variant="lead" />
    );
    const video = container.querySelector("video");
    expect(video).toHaveClass("object-contain");
    expect(video).not.toHaveClass("object-cover");
  });
});
