import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHero } from "@/components/explorer/page-hero";
import { PlainRemoteImage } from "@/components/ui/plain-remote-image";

describe("PlainRemoteImage", () => {
  it("removes the image when it fails to load", () => {
    const { container } = render(
      <PlainRemoteImage src="https://cdn.example/icon.png" alt="" width={40} height={40} />
    );
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(image).toHaveAttribute("width", "40");
    fireEvent.error(image!);
    expect(container.querySelector("img")).toBeNull();
  });

  it("does not render a non-http source", () => {
    const { container } = render(<PlainRemoteImage src="javascript:alert(1)" alt="Icon" />);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("PageHero relay media", () => {
  it("places a fixed icon beside the title and a modest banner under it", () => {
    const { container } = render(
      <PageHero
        title="Example Relay"
        subtitle="relay.example.com"
        icon={{ src: "https://cdn.example/icon.png", alt: "" }}
        bannerSrc="https://cdn.example/banner.png"
      />
    );

    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("width", "40");
    expect(images[0]).toHaveAttribute("height", "40");
    expect(images[0]?.getAttribute("class")).toContain("size-10");
    expect(images[1]?.getAttribute("class")).toContain("h-32");
    expect(screen.getByRole("heading", { name: "Example Relay" })).toBeInTheDocument();
    expect(screen.getByText("relay.example.com")).toBeInTheDocument();
  });
});
