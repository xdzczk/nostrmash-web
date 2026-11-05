import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PostEngagement } from "@/components/explorer/post-engagement";
import { ReactionChips } from "@/components/explorer/reaction-chips";

const stats = [
  { label: "reply_count" as const, value: 1 },
  { label: "repost_count" as const, value: 0 },
  { label: "reaction_count" as const, value: 3 },
  { label: "zap_count" as const, value: 0 },
];

describe("ReactionChips", () => {
  it("renders nothing when the breakdown is empty", () => {
    const { container } = render(<ReactionChips items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders emoji chips beside the reaction count", () => {
    render(
      <PostEngagement
        stats={stats}
        reactionBreakdown={[
          { content: "+", count: 2 },
          { content: "❤️", count: 1 },
        ]}
      />
    );
    expect(screen.getByText("+")).toBeInTheDocument();
    expect(screen.getByText("❤️")).toBeInTheDocument();
    expect(screen.getByLabelText("Reaction breakdown")).toBeInTheDocument();
  });
});
