import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { resetBlossomImageCache, useBlossomImageSrc } from "@/hooks/use-blossom-image-src";
import { BLOSSOM_MIRRORS } from "@/lib/media/blossom";

const HASH = "cd".repeat(32);
const ORIGINAL = `https://media.21media.to/${HASH}.jpg`;

function Probe({ src }: { src: string }) {
  const image = useBlossomImageSrc(src);
  // The hook's caller is what renders the image; this probe is that caller.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image.src ?? ""} alt="blob" onError={image.onError} onLoad={image.onLoad} />;
}

afterEach(() => {
  resetBlossomImageCache();
});

function blobImage(index = 0): HTMLElement {
  const img = screen.getAllByRole("img", { name: "blob" })[index];
  if (!img) throw new Error("missing blob image");
  return img;
}

describe("useBlossomImageSrc", () => {
  it("moves every image of a failed blob onto the next mirror, then remembers the hit", () => {
    const { rerender } = render(
      <>
        <Probe src={ORIGINAL} />
        <Probe src={ORIGINAL} />
      </>
    );

    const first = blobImage();
    expect(first).toHaveAttribute("src", ORIGINAL);
    fireEvent.error(first);

    const mirror = `${BLOSSOM_MIRRORS[0]}/${HASH}.jpg`;
    for (const img of screen.getAllByRole("img", { name: "blob" })) {
      expect(img).toHaveAttribute("src", mirror);
    }

    fireEvent.load(blobImage());
    rerender(<Probe src={ORIGINAL} />);
    expect(screen.getByRole("img", { name: "blob" })).toHaveAttribute("src", mirror);
  });

  it("keeps a non-blob url when it errors", () => {
    render(<Probe src="https://cdn.example/ada.jpg" />);
    fireEvent.error(screen.getByRole("img", { name: "blob" }));
    expect(screen.getByRole("img", { name: "blob" })).toHaveAttribute(
      "src",
      "https://cdn.example/ada.jpg"
    );
  });
});
