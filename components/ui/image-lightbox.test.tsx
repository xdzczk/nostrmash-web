import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { EnlargeableImage } from "@/components/ui/image-lightbox";

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
});
