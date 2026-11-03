import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MediaCard } from "@/components/explorer/media-card";

const PUBKEY = "b".repeat(64);

function picture(urls: string[], kind = 20) {
  return {
    id: "a".repeat(64),
    pubkey: PUBKEY,
    kind,
    created_at: 1_700_000_000,
    content: "Harbor at dusk",
    tags: urls.map((url, index) => [
      "imeta",
      `url ${url}`,
      "m image/jpeg",
      `alt Frame ${index + 1}`,
    ]),
  };
}

function enlargeButtons(container: HTMLElement) {
  return [...container.querySelectorAll("button")].filter((button) =>
    (button.getAttribute("aria-label") ?? "").startsWith("Enlarge")
  );
}

describe("picture carousel", () => {
  it("leaves a single picture as one frame", () => {
    render(<MediaCard event={picture(["https://media.example/one.jpg"])} />);

    expect(screen.queryByRole("region", { name: "Pictures" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next picture" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enlarge Frame 1" })).toBeInTheDocument();
  });

  it("steps through a picture set one frame at a time", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MediaCard
        event={picture(["https://media.example/one.jpg", "https://media.example/two.jpg"])}
      />
    );

    expect(screen.getByRole("region", { name: "Pictures" })).toHaveAttribute(
      "aria-roledescription",
      "carousel"
    );
    expect(screen.getByText("Picture 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(container.querySelector("img[src='https://media.example/one.jpg']")).toHaveClass(
      "max-h-[min(40rem,75vh)]"
    );
    expect(container.querySelector("img[src='https://media.example/two.jpg']")).not.toBeNull();

    const frames = enlargeButtons(container);
    expect(frames).toHaveLength(2);
    expect(frames[0]?.hasAttribute("inert")).toBe(false);
    expect(frames[1]?.hasAttribute("inert")).toBe(true);
    expect(screen.getByRole("button", { name: "Previous picture" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(screen.getByRole("button", { name: "Next picture" })).toHaveAttribute(
      "data-overlay-control"
    );

    await user.click(screen.getByRole("button", { name: "Next picture" }));
    expect(screen.getByText("Picture 2 of 2")).toBeInTheDocument();
    expect(enlargeButtons(container)[0]?.hasAttribute("inert")).toBe(true);
    expect(enlargeButtons(container)[1]?.hasAttribute("inert")).toBe(false);
    expect(screen.getByRole("button", { name: "Next picture" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );

    screen.getByRole("button", { name: "Previous picture" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("Picture 1 of 2")).toBeInTheDocument();
  });

  it("gives a picture set the taller detail frame on the note page", () => {
    const { container } = render(
      <MediaCard
        surface="detail"
        event={picture(["https://media.example/one.jpg", "https://media.example/two.jpg"])}
      />
    );

    expect(container.querySelector("img[src='https://media.example/one.jpg']")).toHaveClass(
      "max-h-[min(44rem,78vh)]"
    );
  });

  it("keeps extra stills on a video in a grid", () => {
    const { container } = render(
      <MediaCard
        event={picture(["https://media.example/one.jpg", "https://media.example/two.jpg"], 21)}
      />
    );

    expect(screen.queryByRole("region", { name: "Pictures" })).not.toBeInTheDocument();
    expect(container.querySelector(".grid")).not.toBeNull();
    expect(container.querySelectorAll("img[src^='https://media.example/']")).toHaveLength(2);
  });

  it("plays a video file and keeps its cover as the poster", () => {
    const { container } = render(
      <MediaCard
        event={{
          id: "d".repeat(64),
          pubkey: PUBKEY,
          kind: 21,
          created_at: 1_700_000_000,
          content: "A hosted video",
          tags: [
            [
              "imeta",
              "url https://media.example/episode.mp4",
              "m video/mp4",
              "image https://media.example/episode.jpg",
            ],
          ],
        }}
      />
    );

    expect(container.querySelector("video")).toHaveAttribute(
      "poster",
      "https://media.example/episode.jpg"
    );
    expect(container.querySelector("img[src='https://media.example/episode.jpg']")).toBeNull();
    expect(container.querySelector(".grid")).toBeNull();
  });

  it("plays a YouTube video instead of laying its thumbnail beside a broken image", () => {
    const { container } = render(
      <MediaCard
        event={{
          id: "c".repeat(64),
          pubkey: PUBKEY,
          kind: 21,
          created_at: 1_700_000_000,
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
        }}
      />
    );

    expect(container.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/H02x_Vpqh9c?rel=0"
    );
    expect(container.querySelector("img[src*='ytimg.com']")).toBeNull();
    expect(container.querySelector("img[src*='youtube.com']")).toBeNull();
    expect(container.querySelector(".grid")).toBeNull();
  });
});
