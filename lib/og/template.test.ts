import { afterEach, describe, expect, it, vi } from "vitest";

import { BLOSSOM_MIRRORS } from "@/lib/media/blossom";
import { loadOgAvatar } from "@/lib/og/template";

const HASH = "ef".repeat(32);
const ORIGINAL = `https://media.21media.to/${HASH}.jpg`;
const MIRROR = `${BLOSSOM_MIRRORS[0]}/${HASH}.jpg`;

function jpegResponse() {
  return new Response(Uint8Array.from([1, 2, 3]), {
    status: 200,
    headers: { "content-type": "image/jpeg" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadOgAvatar", () => {
  it("fetches the next blossom mirror when the author's blob is missing", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === ORIGINAL) {
        return new Response("missing", {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === MIRROR) return jpegResponse();
      throw new Error(`unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadOgAvatar(ORIGINAL);

    expect(result).toMatch(/^data:image\/jpeg;base64,/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not walk mirrors for an ordinary image url", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadOgAvatar("https://cdn.example/ada.jpg")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops when a host answers with a non-image", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadOgAvatar(ORIGINAL)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
