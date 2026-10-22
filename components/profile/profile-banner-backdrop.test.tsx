import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileCover } from "@/components/profile/profile-banner-backdrop";

describe("ProfileCover", () => {
  it("renders a cropped cover", () => {
    render(<ProfileCover src="https://cdn.example/banner.jpg" />);
    const cover = screen.getByTestId("profile-cover");
    expect(cover).toHaveAttribute("aria-hidden", "true");
    expect(cover.querySelector("img")).toHaveAttribute("src", "https://cdn.example/banner.jpg");
  });

  it("removes itself when the image fails, so a missing banner leaves no cover", () => {
    render(<ProfileCover src="https://cdn.example/missing.jpg" />);
    const image = screen.getByTestId("profile-cover").querySelector("img");
    expect(image).not.toBeNull();
    fireEvent.error(image!);
    expect(screen.queryByTestId("profile-cover")).not.toBeInTheDocument();
  });
});
