import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchProfilesByPubkey, hasRichIdentity, hydrateProfiles } from "./profile-hydration";

const getProfileMock = vi.fn();
const getProfilesBatchMock = vi.fn();

vi.mock("@/lib/api/endpoints", () => ({
  getProfile: (...args: unknown[]) => getProfileMock(...args),
  getProfilesBatch: (...args: unknown[]) => getProfilesBatchMock(...args),
}));

describe("profile hydration", () => {
  beforeEach(() => {
    getProfileMock.mockReset();
    getProfilesBatchMock.mockReset();
  });

  it("recognizes inline discovery identity as already rich", () => {
    expect(
      hasRichIdentity({
        pubkey: "abc",
        display_name: "Alice",
      })
    ).toBe(true);
    expect(
      hasRichIdentity({
        pubkey: "abc",
      })
    ).toBe(false);
  });

  it("skips network hydration for profiles that already include identity", async () => {
    const profiles = [
      {
        pubkey: "abc",
        npub: "npub1abc",
        display_name: "Alice",
        picture: "https://cdn.example.com/alice.png",
      },
    ];

    await expect(hydrateProfiles(profiles, "shortTtl")).resolves.toEqual(profiles);
    expect(getProfilesBatchMock).not.toHaveBeenCalled();
    expect(getProfileMock).not.toHaveBeenCalled();
  });

  it("still hydrates sparse profiles through batch and direct fallback", async () => {
    getProfilesBatchMock.mockResolvedValueOnce([
      {
        pubkey: "abc",
      },
    ]);
    getProfileMock.mockResolvedValueOnce({
      pubkey: "abc",
      npub: "npub1abc",
      display_name: "Alice",
      picture: "https://cdn.example.com/alice.png",
    });

    const hydrated = await fetchProfilesByPubkey(["abc"], "shortTtl");

    expect(getProfilesBatchMock).toHaveBeenCalledWith(["abc"], "shortTtl");
    expect(getProfileMock).toHaveBeenCalledWith("abc", "shortTtl");
    expect(hydrated.abc).toMatchObject({
      pubkey: "abc",
      display_name: "Alice",
      picture: "https://cdn.example.com/alice.png",
    });
  });
});
