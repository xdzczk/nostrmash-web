import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteMedia } from "./note-media";

describe("NoteMedia feed variant", () => {
  it("shows one readable frame and a badge for the rest", () => {
    const { container } = render(
      <NoteMedia
        variant="feed"
        content={[
          "https://media.example/one.jpg",
          "https://media.example/two.jpg",
          "https://media.example/three.jpg",
        ].join("\n")}
      />
    );

    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelector("img")).toHaveAttribute("src", "https://media.example/one.jpg");
    expect(container.querySelector("img")).toHaveClass("max-h-[28rem]");
    expect(screen.getByLabelText("2 more attachments")).toHaveTextContent("+2");
  });
});
