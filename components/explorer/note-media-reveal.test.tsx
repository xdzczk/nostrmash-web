import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { resetBlossomImageCache } from "@/hooks/use-blossom-image-src";
import { BLOSSOM_MIRRORS } from "@/lib/media/blossom";

import { NoteMediaReveal } from "./note-media-reveal";

afterEach(() => {
  resetBlossomImageCache();
});

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

  it("retries a missing blossom blob on another server", () => {
    const hash = "d4".repeat(32);
    const url = `https://media.21media.to/${hash}.jpg`;
    const { container } = render(<NoteMediaReveal url={url} kind="image" />);
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", url);

    fireEvent.error(image!);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      `${BLOSSOM_MIRRORS[0]}/${hash}.jpg`
    );
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
    expect(container.querySelector("img")).toHaveAttribute("fetchpriority", "low");

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

  it("does not fetch a video until it is played", () => {
    const url = "https://media.example/clip.mp4#t=0.001";
    const { container } = render(
      <NoteMediaReveal url={url} kind="video" poster="https://media.example/poster.jpg" />
    );

    const video = container.querySelector("video");
    expect(video).toHaveAttribute("src", "https://media.example/clip.mp4");
    expect(video).toHaveAttribute("poster", "https://media.example/poster.jpg");
    expect(video).toHaveAttribute("preload", "none");
    expect(video).toHaveClass("object-contain");
  });

  it("asks for a one-frame preview when a video has no poster", () => {
    const { container } = render(
      <NoteMediaReveal url="https://media.example/clip.mp4#t=0.001" kind="video" />
    );
    const video = container.querySelector("video");
    expect(video).toHaveAttribute("src", "/video-frame?src=https%3A%2F%2Fmedia.example%2Fclip.mp4");
    expect(video).toHaveAttribute("preload", "auto");
    expect(video).not.toHaveAttribute("poster");
  });

  it("embeds a YouTube watch URL instead of treating it as a file", () => {
    const { container } = render(
      <NoteMediaReveal
        url="https://www.youtube.com/watch?v=H02x_Vpqh9c"
        kind="video"
        alt="Tuttle Twins"
      />
    );

    const frame = container.querySelector("iframe");
    expect(frame).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/H02x_Vpqh9c?rel=0"
    );
    expect(frame).toHaveAttribute("title", "Tuttle Twins");
    expect(container.querySelector("video")).toBeNull();
    expect(frame?.parentElement).toHaveClass("aspect-video");
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
