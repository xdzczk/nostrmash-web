import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { NoteMediaReveal } from "./note-media-reveal";

describe("NoteMediaReveal", () => {
  it("does not request external media until the reader reveals it", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <NoteMediaReveal
        url="https://media.example/image.jpg"
        displayUrl="media.example/image.jpg"
        kind="image"
      />
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/expose your IP address/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reveal image" }));
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://media.example/image.jpg"
    );
  });
});
