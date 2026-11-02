import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { resetBlossomImageCache } from "@/hooks/use-blossom-image-src";
import { BLOSSOM_MIRRORS } from "@/lib/media/blossom";
import type { Profile } from "@/lib/types/api";

const profile = {
  pubkey: "a".repeat(64),
  display_name: "Ada",
  picture: "https://cdn.example/ada.jpg",
} as Profile;

afterEach(() => {
  resetBlossomImageCache();
});

describe("ProfileAvatar", () => {
  it("links to the profile when href is set", () => {
    render(
      <ProfileAvatar
        profile={profile}
        size={40}
        href="/profiles/npub1ada"
        className="h-10 w-10 rounded-full"
      />
    );

    expect(screen.getByRole("link", { name: "View Ada" })).toHaveAttribute(
      "href",
      "/profiles/npub1ada"
    );
    expect(screen.queryByRole("button", { name: /enlarge/i })).not.toBeInTheDocument();
  });

  it("enlarges a remote photo when requested", async () => {
    const user = userEvent.setup();
    render(
      <ProfileAvatar profile={profile} size={112} enlarge className="h-20 w-20 rounded-full" />
    );

    await user.click(screen.getByRole("button", { name: "Enlarge photo of Ada" }));
    const dialog = screen.getByRole("dialog", { name: "Ada" });
    expect(dialog.querySelector("img")).toHaveAttribute("src", "https://cdn.example/ada.jpg");
  });

  it("tries another blossom server before the letter fallback", () => {
    const hash = "a1".repeat(32);
    const picture = `https://media.21media.to/${hash}.jpg`;
    render(<ProfileAvatar profile={{ ...profile, picture }} size={40} />);

    const avatar = () => screen.getByRole("img", { name: "Ada" });
    expect(avatar()).toHaveAttribute("src", picture);

    fireEvent.error(avatar());
    expect(avatar()).toHaveAttribute("src", `${BLOSSOM_MIRRORS[0]}/${hash}.jpg`);

    for (let attempt = 0; attempt < BLOSSOM_MIRRORS.length; attempt += 1) {
      fireEvent.error(avatar());
    }
    expect(avatar().getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  });
});
