import { describe, expect, it } from "vitest";

import { PUBLIC_EDGE_CACHE_CONTROL, publicEdgeCacheHeaders } from "./public-edge-cache";

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

  it("leaves unique pages, errors, and cookie-setting responses uncached", () => {
    expect(
      publicEdgeCacheHeaders(new URL("https://nostrmash.com/notes/abc"), response())
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
