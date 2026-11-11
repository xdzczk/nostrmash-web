import { describe, expect, it } from "vitest";

import {
  ENTITY_EDGE_CACHE_CONTROL,
  PUBLIC_EDGE_CACHE_CONTROL,
  publicEdgeCacheHeaders,
} from "./public-edge-cache";

function response(status = 200, headers?: HeadersInit) {
  return new Response("ok", { status, headers });
}

describe("publicEdgeCacheHeaders", () => {
  it("caches the stable public pages for 60 seconds", () => {
    const headers = publicEdgeCacheHeaders(new URL("https://nostrmash.com/relays"), response());
    expect(headers?.get("Cache-Control")).toBe(PUBLIC_EDGE_CACHE_CONTROL);
    expect(headers?.get("Vary")).toBe("RSC, Next-Router-Prefetch, Next-Router-State-Tree");
  });

  it("keeps the homepage from mixing language-cookie visitors with everyone else", () => {
    const headers = publicEdgeCacheHeaders(new URL("https://nostrmash.com/"), response());
    expect(headers?.get("Vary")).toContain("Cookie");
  });

  it("shares a homepage whose language is already in the query string", () => {
    const headers = publicEdgeCacheHeaders(new URL("https://nostrmash.com/?lang=de"), response());
    expect(headers?.get("Vary")).not.toContain("Cookie");
  });

  it("preserves an existing Vary list", () => {
    const headers = publicEdgeCacheHeaders(
      new URL("https://nostrmash.com/methodology"),
      response(200, { Vary: "Accept-Encoding" })
    );
    expect(headers?.get("Vary")).toBe(
      "Accept-Encoding, RSC, Next-Router-Prefetch, Next-Router-State-Tree"
    );
  });

  it("caches rankings, stats, and search for 60 seconds", () => {
    for (const path of [
      "/trending/notes",
      "/discovery/profiles/rising",
      "/stats",
      "/stats/people",
      "/search",
    ]) {
      const headers = publicEdgeCacheHeaders(new URL(`https://nostrmash.com${path}`), response());
      expect(headers?.get("Cache-Control")).toBe(PUBLIC_EDGE_CACHE_CONTROL);
    }
  });

  it("keeps a ranking without its cookie param from being shared", () => {
    const trending = publicEdgeCacheHeaders(
      new URL("https://nostrmash.com/trending/notes"),
      response()
    );
    expect(trending?.get("Vary")).toContain("Cookie");

    const followed = publicEdgeCacheHeaders(
      new URL("https://nostrmash.com/discovery/profiles/followed"),
      response()
    );
    expect(followed?.get("Vary")).toContain("Cookie");

    const search = publicEdgeCacheHeaders(new URL("https://nostrmash.com/search"), response());
    expect(search?.get("Vary")).toContain("Cookie");
  });

  it("shares a ranking whose cookie param is already in the query string", () => {
    const trending = publicEdgeCacheHeaders(
      new URL("https://nostrmash.com/trending/notes?lang=de"),
      response()
    );
    expect(trending?.get("Vary")).not.toContain("Cookie");

    const followed = publicEdgeCacheHeaders(
      new URL("https://nostrmash.com/discovery/profiles/followed?viewer=npub1example"),
      response()
    );
    expect(followed?.get("Vary")).not.toContain("Cookie");

    const search = publicEdgeCacheHeaders(
      new URL("https://nostrmash.com/search?q=nostr&lang=de"),
      response()
    );
    expect(search?.get("Vary")).not.toContain("Cookie");
  });

  it("caches entity pages longer and does not vary them on cookies", () => {
    for (const path of [
      "/notes/abc",
      "/profiles/abc",
      "/hashtags/nostr",
      "/hashtags/nostr/notes",
      "/domains/example.com",
      "/relays/relay.example",
    ]) {
      const headers = publicEdgeCacheHeaders(new URL(`https://nostrmash.com${path}`), response());
      expect(headers?.get("Cache-Control")).toBe(ENTITY_EDGE_CACHE_CONTROL);
      expect(headers?.get("Vary")).not.toContain("Cookie");
    }
  });

  it("keeps relay health on the short shared cache", () => {
    const headers = publicEdgeCacheHeaders(
      new URL("https://nostrmash.com/relays/health"),
      response()
    );
    expect(headers?.get("Cache-Control")).toBe(PUBLIC_EDGE_CACHE_CONTROL);
  });

  it("leaves personal pages, APIs, errors, and cookie-setting responses uncached", () => {
    expect(publicEdgeCacheHeaders(new URL("https://nostrmash.com/me"), response())).toBeNull();
    expect(
      publicEdgeCacheHeaders(new URL("https://nostrmash.com/api/link-preview"), response())
    ).toBeNull();
    expect(
      publicEdgeCacheHeaders(new URL("https://nostrmash.com/methodology"), response(500))
    ).toBeNull();
    expect(
      publicEdgeCacheHeaders(
        new URL("https://nostrmash.com/"),
        response(200, { "Set-Cookie": "nm_lang=de" })
      )
    ).toBeNull();
  });
});
