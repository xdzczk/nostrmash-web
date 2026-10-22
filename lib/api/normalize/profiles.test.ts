import { describe, expect, it } from "vitest";

import {
  mapProfileWhyNow,
  mapRelatedProfileReasons,
  relatedRailReasonLine,
} from "@/components/explorer/why-now";
import { normalizeProfile } from "@/lib/api/normalize/entities";
import {
  normalizeProfileSummaryResponse,
  normalizeRelatedProfilesResponse,
  normalizeUserMutedByResponse,
} from "@/lib/api/normalize/profiles";

const PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const OTHER = "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2";

describe("normalizeProfile hero metadata", () => {
  it("keeps banner, bot flag and custom fields", () => {
    const profile = normalizeProfile({
      pubkey: PUBKEY,
      name: "fiatjaf",
      banner: "https://cdn.example/banner.png",
      bot: true,
      fields: [
        ["GitHub", "https://github.com/fiatjaf"],
        ["Alt", "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6"],
      ],
    });

    expect(profile).toMatchObject({
      banner: "https://cdn.example/banner.png",
      bot: true,
      fields: [
        ["GitHub", "https://github.com/fiatjaf"],
        ["Alt", "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6"],
      ],
    });
  });

  it("drops malformed fields and caps the list", () => {
    const profile = normalizeProfile({
      pubkey: PUBKEY,
      fields: [
        ["ok", "value"],
        ["", "missing label"],
        ["missing value", ""],
        ["too", "long".repeat(80)],
        "not a tuple",
        ["a", "1"],
        ["b", "2"],
        ["c", "3"],
        ["d", "4"],
        ["e", "5"],
        ["f", "6"],
        ["g", "7"],
        ["h", "8"],
      ],
    });

    expect(profile?.fields).toHaveLength(8);
    expect(profile?.fields?.[0]).toEqual(["ok", "value"]);
    expect(profile?.fields?.some(([label]) => label === "too")).toBe(false);
  });

  it("leaves banner/bot/fields undefined when absent", () => {
    const profile = normalizeProfile({ pubkey: PUBKEY });
    expect(profile?.banner).toBeUndefined();
    expect(profile?.bot).toBeUndefined();
    expect(profile?.fields).toBeUndefined();
  });
});

describe("normalizeRelatedProfilesResponse", () => {
  it("surfaces degraded flags from the top level", () => {
    const payload = normalizeRelatedProfilesResponse({
      pubkey: PUBKEY,
      related_profiles: [{ pubkey: OTHER }],
      degraded: true,
      degraded_reason: "related_profiles_unavailable",
    });

    expect(payload.degraded).toBe(true);
    expect(payload.degraded_reason).toBe("related_profiles_unavailable");
    expect(payload.related_profiles).toHaveLength(1);
  });

  it("surfaces degraded flags from meta and leaves them undefined when healthy", () => {
    const degraded = normalizeRelatedProfilesResponse({
      related_profiles: [],
      meta: { degraded: true, degraded_reason: "cold_start" },
    });
    expect(degraded.degraded).toBe(true);
    expect(degraded.degraded_reason).toBe("cold_start");

    const healthy = normalizeRelatedProfilesResponse({ related_profiles: [{ pubkey: OTHER }] });
    expect(healthy.degraded).toBeUndefined();
    expect(healthy.degraded_reason).toBeUndefined();
  });

  it("keeps adjacency reasons on related entries", () => {
    const payload = normalizeRelatedProfilesResponse({
      related_profiles: [
        {
          pubkey: OTHER,
          reasons: ["interaction_adjacency", "topic_overlap"],
          interaction_adjacency: 13,
          topic_overlap: 9,
          score: 242,
        },
      ],
    });

    expect(payload.related_profiles?.[0]).toMatchObject({
      reasons: ["interaction_adjacency", "topic_overlap"],
      interaction_adjacency: 13,
      topic_overlap: 9,
      score: 242,
    });
  });
});

describe("normalizeProfileSummaryResponse", () => {
  it("normalizes trust_summary and metadata timestamps", () => {
    const summary = normalizeProfileSummaryResponse({
      pubkey: PUBKEY,
      profile: { pubkey: PUBKEY },
      trust_summary: { tier: "seed", hop_distance: 0, percentile: 0.0015 },
      metadata_event_id: "67a59200716c385cd43c84dbbc5ebed783844ca56625787fdbf586bfc471ee67",
      metadata_created_at: 1789138347,
    });

    expect(summary.trust_summary).toMatchObject({
      tier: "seed",
      hop_distance: 0,
      percentile: 0.0015,
    });
    expect(summary.metadata_created_at).toBe(1789138347);
    expect(summary.metadata_event_id).toMatch(/^67a59200/);
  });
});

describe("mapRelatedProfileReasons", () => {
  it("turns adjacency counts into readable reasons", () => {
    const reasons = mapRelatedProfileReasons({
      pubkey: OTHER,
      reasons: [
        "interaction_adjacency",
        "quote_repost_adjacency",
        "reply_adjacency",
        "topic_overlap",
      ],
      interaction_adjacency: 13,
      reply_adjacency: 3,
      quote_repost_adjacency: 7,
      topic_overlap: 1,
    });

    expect(reasons.map((reason) => reason.text)).toEqual([
      "interacts often",
      "replies back and forth",
      "quotes and reposts",
      "shared topics",
    ]);
    expect(reasons[0]?.support).toBe("13 interactions");
    expect(reasons[1]?.support).toBe("3 replies");
    expect(reasons[3]?.support).toBe("1 topic");
  });

  it("falls back to reason codes without counts and returns [] for unrelated profiles", () => {
    expect(mapRelatedProfileReasons({ pubkey: OTHER, reasons: ["topic_overlap"] })).toEqual([
      { text: "shared topics", support: undefined },
    ]);
    expect(mapRelatedProfileReasons({ pubkey: OTHER })).toEqual([]);
  });

  it("is preferred by mapProfileWhyNow over momentum heuristics", () => {
    const reasons = mapProfileWhyNow({
      pubkey: OTHER,
      interaction_adjacency: 5,
      follower_count: 10_000,
    });
    expect(reasons[0]?.text).toBe("interacts often");
  });

  it("lists every adjacency signal on one rail line", () => {
    expect(
      relatedRailReasonLine({
        pubkey: OTHER,
        interaction_adjacency: 13,
        reply_adjacency: 3,
        quote_repost_adjacency: 7,
        topic_overlap: 9,
      })
    ).toBe("13 interactions · 3 replies · 7 shares · 9 topics");
  });
});

describe("normalizeUserMutedByResponse", () => {
  it("keeps muters identified by muter_pubkey", () => {
    const result = normalizeUserMutedByResponse({
      pubkey: PUBKEY,
      items: [
        {
          muter_pubkey: OTHER,
          source_event_id: "a".repeat(64),
          mute_list_created_at: 1_792_641_305,
        },
      ],
    });
    expect(result.profiles?.map((profile) => profile.pubkey)).toEqual([OTHER]);
  });
});
