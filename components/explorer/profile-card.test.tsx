import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileCard } from "@/components/explorer/profile-card";
import type { Profile } from "@/lib/types/api";

const PUBKEY = "ab".repeat(32);

describe("ProfileCard ranking order", () => {
  it("shows a followed account's audience once", () => {
    const profile = {
      pubkey: PUBKEY,
      display_name: "Ada",
      score: 4,
      follower_count: 4,
      ranking: {
        rank: 1,
        score: 4,
        reasons: [
          {
            code: "audience_size",
            evidence: [{ metric: "follower_count", value: 4, unit: "followers" }],
          },
        ],
      },
    } satisfies Profile;

    render(<ProfileCard profile={profile} rank={1} discoverySignals />);

    expect(screen.getByText("audience size")).toBeInTheDocument();
    expect(screen.getByText("4 followers")).toBeInTheDocument();
    expect(screen.queryByText("Score")).not.toBeInTheDocument();
    expect(screen.queryByText("Follower Count")).not.toBeInTheDocument();
  });

  it("explains most supported with the capped amount and the supporter count", () => {
    const capped = (100_000).toLocaleString();
    const profile = {
      pubkey: PUBKEY,
      display_name: "Ada",
      score: 100_000,
      capped_sats: 100_000,
      sats_received: 500_000,
      supporter_count: 3,
      recent_zap_volume_msats: 500_000_000,
      ranking: {
        rank: 1,
        score: 100_000,
        reasons: [
          {
            code: "supporter_sats",
            evidence: [{ metric: "capped_sats", value: 100_000, unit: "sats" }],
          },
        ],
      },
    } satisfies Profile;

    render(<ProfileCard profile={profile} rank={1} discoverySignals />);

    expect(screen.getByText("capped sats")).toBeInTheDocument();
    expect(screen.getByText(`${capped} sats`)).toBeInTheDocument();
    expect(screen.getByText("Capped sats")).toBeInTheDocument();
    expect(screen.getByText("Supporters")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByText((500_000).toLocaleString())).not.toBeInTheDocument();
  });
});
