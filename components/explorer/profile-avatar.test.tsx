import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import type { Profile } from "@/lib/types/api";

const profile = {
  pubkey: "a".repeat(64),
  display_name: "Ada",
  picture: "https://cdn.example/ada.jpg",
} as Profile;

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
});
