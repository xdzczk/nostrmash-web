import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { resetBlossomImageCache } from "@/hooks/use-blossom-image-src";
import { BLOSSOM_MIRRORS, blossomCandidateUrls } from "@/lib/media/blossom";

import { ProfileCover } from "./profile-banner-backdrop";

afterEach(() => {
  resetBlossomImageCache();
});

describe("ProfileCover", () => {
  it("tries blossom mirrors and then removes the cover", () => {
    const hash = "c3".repeat(32);
    const src = `https://media.21media.to/${hash}.jpg`;
    render(<ProfileCover src={src} />);

    const image = () => screen.getByTestId("profile-cover").querySelector("img");
    expect(image()).toHaveAttribute("src", src);

    fireEvent.error(image()!);
    expect(image()).toHaveAttribute("src", `${BLOSSOM_MIRRORS[0]}/${hash}.jpg`);

    const remaining = blossomCandidateUrls(src).length - 1;
    for (let attempt = 0; attempt < remaining; attempt += 1) {
      fireEvent.error(image()!);
    }
    expect(screen.queryByTestId("profile-cover")).not.toBeInTheDocument();
  });
});
