import { describe, expect, it } from "vitest";

import { filterAuthoredNotes, normalizeEventRecord, normalizeProfile } from "./normalize";
import { profileLabel, profilePictureUrl } from "../../components/explorer/utils";
import type { Profile } from "../types/api";
import { hexToNpub, npubToHex } from "../nostr/npub";

describe("normalizeProfile", () => {
  it("maps camelCase identity aliases to canonical fields", () => {
    const profile = normalizeProfile({
      pubkey: "abc123",
      displayName: "Alice",
      image: "https://cdn.example.com/alice.jpg",
      avatar_url: "https://cdn.example.com/unused.jpg",
      username: "alice_user",
      description: "nostr builder",
      url: "https://alice.example.com",
      nip_05: "_@alice.example.com",
    });

    expect(profile).not.toBeNull();
    expect(profile?.pubkey).toBe("abc123");
    expect(profile?.display_name).toBe("Alice");
    expect(profile?.name).toBe("alice_user");
    expect(profile?.picture).toBe("https://cdn.example.com/alice.jpg");
    expect(profile?.about).toBe("nostr builder");
    expect(profile?.website).toBe("https://alice.example.com");
    expect(profile?.nip05).toBe("_@alice.example.com");
  });

  it("hydrates fields from stringified nostr metadata content", () => {
    const profile = normalizeProfile({
      pubkey: "def456",
      content: JSON.stringify({
        name: "bob",
        display_name: "Bob",
        picture: "https://cdn.example.com/bob.png",
        about: "from content json",
      }),
    });

    expect(profile).not.toBeNull();
    expect(profile?.pubkey).toBe("def456");
    expect(profile?.display_name).toBe("Bob");
    expect(profile?.name).toBe("bob");
    expect(profile?.picture).toBe("https://cdn.example.com/bob.png");
    expect(profile?.about).toBe("from content json");
  });

  it("preserves discovery profile metrics from API payloads", () => {
    const profile = normalizeProfile({
      pubkey: "metric123",
      display_name: "Metric Profile",
      recent_new_followers: 14,
      recent_engagement_received: 37,
      recent_post_count: 9,
    });

    expect(profile).not.toBeNull();
    expect(profile?.recent_new_followers).toBe(14);
    expect(profile?.recent_engagement_received).toBe(37);
    expect(profile?.recent_post_count).toBe(9);
  });

  it("merges nested metadata and profile wrappers", () => {
    const profile = normalizeProfile({
      profile: {
        author_pubkey: "ffeedd",
        metadata: JSON.stringify({
          displayName: "Carol",
          pfp: "https://cdn.example.com/carol.webp",
          bio: "from metadata string",
          homepage: "https://carol.example.com",
        }),
      },
    });

    expect(profile).not.toBeNull();
    expect(profile?.pubkey).toBe("ffeedd");
    expect(profile?.display_name).toBe("Carol");
    expect(profile?.picture).toBe("https://cdn.example.com/carol.webp");
    expect(profile?.about).toBe("from metadata string");
    expect(profile?.website).toBe("https://carol.example.com");
  });

  it("gracefully ignores invalid JSON metadata/content", () => {
    expect(() =>
      normalizeProfile({
        pubkey: "112233",
        content: "{not-json",
        metadata: "{also-not-json",
        displayName: "Fallback Name",
        avatar_url: "https://cdn.example.com/fallback.png",
      })
    ).not.toThrow();

    const profile = normalizeProfile({
      pubkey: "112233",
      content: "{not-json",
      metadata: "{also-not-json",
      displayName: "Fallback Name",
      avatar_url: "https://cdn.example.com/fallback.png",
    });

    expect(profile).not.toBeNull();
    expect(profile?.pubkey).toBe("112233");
    expect(profile?.display_name).toBe("Fallback Name");
    expect(profile?.picture).toBe("https://cdn.example.com/fallback.png");
  });
});

describe("normalizeEventRecord", () => {
  it("lifts nested counts aliases to top-level engagement fields", () => {
    const note = normalizeEventRecord({
      event_id: "event_123",
      author_pubkey: "pubkey_abc",
      content: "hello nostr",
      counts: {
        reply_count: 3,
        reaction_count: 5,
        repost_count: 2,
        zap_count: 7,
        zap_msats: 42000,
      },
    });

    expect(note).not.toBeNull();
    expect(note?.id).toBe("event_123");
    expect(note?.pubkey).toBe("pubkey_abc");
    expect(note?.reply_count).toBe(3);
    expect(note?.reaction_count).toBe(5);
    expect(note?.repost_count).toBe(2);
    expect(note?.zap_count).toBe(7);
    expect(note?.zap_msats).toBe(42000);
  });
});

describe("profile display helpers", () => {
  it("resolves alias display names and normalizes schemeless picture urls", () => {
    const profile = {
      pubkey: "abc",
      displayName: "Alias Display",
      image: "//cdn.example.com/pfp.png",
    } as const;

    expect(profileLabel(profile)).toBe("Alias Display");
    expect(profilePictureUrl(profile)).toBe("https://cdn.example.com/pfp.png");
  });

  it("rejects unsupported image protocols", () => {
    const profile = {
      pubkey: "def",
      picture: "javascript:alert(1)",
    } as const;

    expect(profilePictureUrl(profile)).toBeNull();
  });

  it("resolves identity fields from nested profile wrappers", () => {
    const profile = {
      profile: {
        profile_pubkey: "001122",
        content: {
          display_name: "Nested Display",
          picture: "https://cdn.example.com/nested.png",
        },
      },
    } as unknown as Profile;

    expect(profileLabel(profile)).toBe("Nested Display");
    expect(profilePictureUrl(profile)).toBe("https://cdn.example.com/nested.png");
  });

  it("formats pubkey fallback label as npub when possible", () => {
    const pubkey = "2d9873b25bf2dda6141684d44d5eb76af59f167788a58e363ab1671fefee87f2";
    const profile = { pubkey } as Profile;
    const label = profileLabel(profile);
    expect(label.startsWith("npub1")).toBe(true);
  });
});

describe("filterAuthoredNotes", () => {
  it("removes reactions, zaps, reposts, and metadata from authored note feeds", () => {
    const filtered = filterAuthoredNotes([
      { id: "note-1", kind: 1, content: "hello" },
      { id: "reaction-1", kind: 7, content: "+" },
      { id: "zap-1", kind: 9735, content: "" },
      { id: "repost-1", kind: 6, content: "" },
      { id: "meta-1", kind: 0, content: "{}" },
    ]);

    expect(filtered.map((event) => event.id)).toEqual(["note-1"]);
  });
});

describe("normalizeAuthorZapsResponse", () => {
  it("maps authored zap receipt events into zap activity records", async () => {
    const { normalizeAuthorZapsResponse } = await import("./normalize");
    const payload = normalizeAuthorZapsResponse({
      zaps: [
        {
          id: "zap-event-1",
          kind: 9735,
          pubkey: "sender-pubkey",
          created_at: 1_700_000_000,
          content: "",
          tags: [
            ["p", "receiver-pubkey"],
            ["e", "target-note-id"],
            [
              "description",
              JSON.stringify({
                content: "great post",
                tags: [["amount", "21000"]],
              }),
            ],
          ],
        },
      ],
    });

    expect(payload.zaps?.[0]?.sender_pubkey).toBe("sender-pubkey");
    expect(payload.zaps?.[0]?.target_event_id).toBe("target-note-id");
    expect(payload.zaps?.[0]?.sats).toBe(21);
    expect(payload.zaps?.[0]?.zap_text).toBe("great post");
  });
});

describe("npub helpers", () => {
  it("round-trips hex pubkey through npub encoding", () => {
    const pubkey = "2d9873b25bf2dda6141684d44d5eb76af59f167788a58e363ab1671fefee87f2";
    const npub = hexToNpub(pubkey);
    expect(npub).not.toBeNull();
    expect(npubToHex(npub ?? "")).toBe(pubkey);
  });
});
