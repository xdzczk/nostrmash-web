import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { resetBlossomImageCache } from "@/hooks/use-blossom-image-src";
import { BLOSSOM_MIRRORS } from "@/lib/media/blossom";
import { EnlargeableImage, fittedMediaSize } from "@/components/ui/image-lightbox";

afterEach(() => {
  resetBlossomImageCache();
});

describe("fittedMediaSize", () => {
  it("fills the stage on the limiting side and scales small pictures up", () => {
    expect(fittedMediaSize(2000, 1000, 1000, 800)).toEqual({ width: 1000, height: 500 });
    expect(fittedMediaSize(739, 1600, 1200, 800)).toEqual({ width: 369, height: 800 });
    expect(fittedMediaSize(240, 180, 1000, 800)).toEqual({ width: 1000, height: 750 });
    expect(fittedMediaSize(0, 100, 100, 100)).toBeNull();
  });
});

describe("EnlargeableImage", () => {
  it("opens a dialog on click and closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <EnlargeableImage src="https://media.example/photo.jpg" alt="Attached photo">
        <img src="https://media.example/photo.jpg" alt="" />
      </EnlargeableImage>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Enlarge Attached photo" }));
    expect(screen.getByRole("dialog", { name: "Attached photo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Attached photo" })).toHaveAttribute(
      "src",
      "https://media.example/photo.jpg"
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(
      <EnlargeableImage src="https://media.example/photo.jpg" alt="Wide shot">
        <img src="https://media.example/photo.jpg" alt="" />
      </EnlargeableImage>
    );

    await user.click(screen.getByRole("button", { name: "Enlarge Wide shot" }));
    await user.click(screen.getByRole("button", { name: "Dismiss enlarged image" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("retries a blossom blob when the enlarged photo fails", async () => {
    const user = userEvent.setup();
    const hash = "b2".repeat(32);
    const url = `https://media.21media.to/${hash}.jpg`;
    render(
      <EnlargeableImage src={url} alt="Attached photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" />
      </EnlargeableImage>
    );

    await user.click(screen.getByRole("button", { name: "Enlarge Attached photo" }));
    const photo = screen.getByRole("img", { name: "Attached photo" });
    fireEvent.error(photo);
    expect(photo).toHaveAttribute("src", `${BLOSSOM_MIRRORS[0]}/${hash}.jpg`);
  });
});
