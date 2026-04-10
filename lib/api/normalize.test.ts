import { describe, expect, it } from "vitest";

import { normalizeProfile } from "./normalize";
import { profileLabel, profilePictureUrl } from "../../components/explorer/utils";

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
});
