import { describe, expect, it } from "vitest";

import {
  normalizeAccountStats,
  normalizeAuthorAnalyticsSummary,
} from "@/lib/api/normalize/ecosystem";
import {
  normalizeContentShape,
  normalizeEmergingDomains,
  normalizeEmergingHashtags,
  normalizeEventPoll,
  normalizeKindMix,
  normalizeProfileModeration,
  normalizeRelayListStats,
  readTrustedEngagementShare,
} from "@/lib/api/normalize/surfaces";
import { accountAgeLabel } from "@/lib/stats/surface-display";

describe("surface normalizers", () => {
  it("drops placeholder momentum and mute fields", () => {
    expect(
      normalizeEmergingDomains({
        items: [{ domain: "Example.COM", z_score_7d: 3, status: "emerging" }, { domain: "" }],
      })
    ).toEqual({
      items: [{ domain: "example.com", z_score_7d: 3, status: "emerging" }],
    });

    expect(
      normalizeEmergingHashtags({
        consistency: "eventual",
        items: [{ hashtag: "#Nostr", z_score_7d: 2.5, status: "emerging", half_life_days: 0 }],
      })
    ).toEqual({
      consistency: "eventual",
      items: [{ hashtag: "nostr", z_score_7d: 2.5, status: "emerging" }],
    });

    expect(
      normalizeProfileModeration({
        pubkey: "ab".repeat(32),
        reports_received: 3,
        muted_by_count: 1,
        mute_rate_bps: 0,
      })
    ).toEqual({
      pubkey: "ab".repeat(32),
      reports_received: 3,
      muted_by_count: 1,
    });
  });

  it("omits relay-list read and write share placeholders", () => {
    const stats = normalizeRelayListStats({
      series: [
        {
          day: "2026-11-01",
          lists: 4,
          avg_relays_x100: 250,
          read_only_share_bps: 0,
          write_only_share_bps: 0,
        },
      ],
    });
    expect(stats.series).toEqual([{ day: "2026-11-01", lists: 4, avg_relays_x100: 250 }]);
  });

  it("keeps length buckets from a histogram and kind rows from the live payload", () => {
    const shape = normalizeContentShape({
      content: {
        length_and_mentions: [
          { kind: 1, posts: 10, mentions: 2, hashtags: 1, length_hist: { "0_80": 8, "80_280": 2 } },
        ],
        engagement_by_kind: [{ kind: 1, posts: 10, reactions: 4, replies: 1, zaps: 0 }],
      },
    });
    expect(shape.rows).toEqual([
      {
        kind: 1,
        posts: 10,
        mentions: 2,
        hashtags: 1,
        length: { "0_80": 8, "80_280": 2 },
      },
    ]);
    expect(shape.length_buckets).toEqual({ "0_80": 8, "80_280": 2 });
    expect(shape.mention_total).toBe(2);
    expect(shape.engagement_by_kind?.[0]?.reactions).toBe(4);
  });

  it("reads length buckets when the payload is an object", () => {
    const shape = normalizeContentShape({
      length_and_mentions: { "0_80": 3, "1000_plus": 1, mentions: 9 },
    });
    expect(shape.length_buckets).toEqual({ "0_80": 3, "1000_plus": 1 });
    expect(shape.mention_total).toBe(9);
  });

  it("accepts poll options as objects or strings", () => {
    const poll = normalizeEventPoll({
      event_id: "cd".repeat(32),
      options: [{ id: "a", label: "Yes" }, "Maybe"],
      counts: [{ option_id: "a", votes: 2 }],
    });
    expect(poll.options).toEqual([
      { id: "a", label: "Yes" },
      { id: "Maybe", label: "Maybe" },
    ]);
    expect(poll.counts).toEqual([{ option_id: "a", votes: 2 }]);
  });

  it("keeps numeric kind mix keys only", () => {
    expect(normalizeKindMix({ "1": 4, "30023": 1, software: 2, "-1": 3 })).toEqual({
      "1": 4,
      "30023": 1,
    });
  });

  it("keeps trusted engagement only inside 0 to 1", () => {
    expect(readTrustedEngagementShare({ trusted_engagement_share: 0.25 })).toBe(0.25);
    expect(
      readTrustedEngagementShare({ counts: { trusted_engagement_share: 1.2 } })
    ).toBeUndefined();
  });

  it("labels account-age buckets 0 through 5", () => {
    expect(accountAgeLabel(0)).toBe("<1 day");
    expect(accountAgeLabel(1)).toBe("1–7 days");
    expect(accountAgeLabel(2)).toBe("7–30 days");
    expect(accountAgeLabel(3)).toBe("30–90 days");
    expect(accountAgeLabel(4)).toBe("90–365 days");
    expect(accountAgeLabel(5)).toBe("1 year+");
    const accounts = normalizeAccountStats({
      account_age: [
        { bucket: 0, authors: 2 },
        { bucket: 6, authors: 1 },
      ],
    });
    expect(accounts.account_age).toEqual([{ bucket: 0, authors: 2 }]);
  });

  it("keeps a negative net follower change and drops placeholder graph fields", () => {
    const summary = normalizeAuthorAnalyticsSummary({
      graph: {
        mutual_count: 3,
        reciprocity_bps: 1500,
        mentioned_not_followed_count: 0,
        mutual_edge_share_bps: 0,
      },
      net_follower_change_7d: -4,
    });
    expect(summary.graph).toEqual({ mutual_count: 3, reciprocity_bps: 1500 });
    expect(summary.net_follower_change_7d).toBe(-4);
  });
});
