import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileRepliesList } from "@/components/profile/profile-replies-list";
import type { EventRecord } from "@/lib/types/api";

const PARENT = "a".repeat(64);
const MISSING = "b".repeat(64);

function reply(id: string, parentId: string, content: string): EventRecord {
  return {
    id,
    pubkey: "c".repeat(64),
    kind: 1,
    content,
    created_at: 1_700_000_000,
    tags: [["e", parentId, "", "reply"]],
  };
}

describe("ProfileRepliesList", () => {
  it("quotes a loaded parent and falls back when the parent is missing", () => {
    render(
      <ProfileRepliesList
        replies={[
          reply("d".repeat(64), PARENT, "Thanks for the note"),
          reply("e".repeat(64), MISSING, "Still here"),
        ]}
        parentsById={{
          [PARENT]: {
            id: PARENT,
            pubkey: "f".repeat(64),
            kind: 1,
            content: "Hello from the parent",
          },
        }}
      />
    );

    expect(screen.getByRole("link", { name: "Hello from the parent" })).toHaveAttribute(
      "href",
      `/notes/${PARENT}`
    );
    expect(screen.getByRole("link", { name: "Replying to a note" })).toHaveAttribute(
      "href",
      `/notes/${MISSING}`
    );
    expect(screen.getByText("Thanks for the note")).toBeInTheDocument();
    expect(screen.getByText("Still here")).toBeInTheDocument();
  });
});
