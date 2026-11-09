import { describe, expect, it } from "vitest";

import { resolveRankingPreference } from "@/lib/search-params/ranking-preference";
import {
  VIEWER_COOKIE,
  VIEWER_COOKIE_MAX_AGE,
  parseViewer,
  resolveViewerPreference,
  serializeViewerCookie,
  viewerCookieMutation,
} from "@/lib/search-params/viewer";

const VIEWER = "ab".repeat(32);
const OTHER = "cd".repeat(32);

function queryOf(redirectTo: string | undefined): URLSearchParams {
  const index = redirectTo?.indexOf("?") ?? -1;
  return new URLSearchParams(index >= 0 ? redirectTo!.slice(index + 1) : "");
}

describe("parseViewer", () => {
  it("accepts an npub or 64-hex pubkey and rejects everything else", () => {
    expect(parseViewer(undefined)).toBeUndefined();
    expect(parseViewer("")).toBeUndefined();
    expect(parseViewer(`  ${VIEWER.toUpperCase()}  `)).toBe(VIEWER.toUpperCase());
    expect(parseViewer("npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq")).toBe(
      "npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"
    );
    expect(parseViewer("not-a-key")).toBeUndefined();
    expect(parseViewer("npub1")).toBeUndefined();
    expect(parseViewer(`${VIEWER}ff`)).toBeUndefined();
  });
});

describe("viewer cookie", () => {
  it("stores a valid key for one year and clears an invalid one", () => {
    expect(viewerCookieMutation(VIEWER)).toEqual({
      action: "set",
      name: VIEWER_COOKIE,
      value: VIEWER,
      options: { maxAge: VIEWER_COOKIE_MAX_AGE, sameSite: "lax", path: "/" },
    });
    expect(VIEWER_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
    expect(serializeViewerCookie(VIEWER)).toBe(
      `${VIEWER_COOKIE}=${VIEWER}; Max-Age=${VIEWER_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`
    );
    expect(viewerCookieMutation("not-a-key")).toEqual({ action: "clear", name: VIEWER_COOKIE });
    expect(serializeViewerCookie("")).toBe(`${VIEWER_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`);
  });
});

describe("resolveViewerPreference", () => {
  it("redirects a saved key onto the URL and keeps window, lang, and offset", () => {
    const decision = resolveViewerPreference(
      "/trending/notes",
      { window: "7d", lang: "de", offset: "20" },
      VIEWER
    );
    const query = queryOf(decision.redirectTo);
    expect(decision.redirectTo?.startsWith("/trending/notes?")).toBe(true);
    expect(query.get("viewer")).toBe(VIEWER);
    expect(query.get("window")).toBe("7d");
    expect(query.get("lang")).toBe("de");
    expect(query.get("offset")).toBe("20");
  });

  it("leaves an explicit viewer as-is, including a different saved key", () => {
    expect(resolveViewerPreference("/", { viewer: OTHER }, VIEWER)).toEqual({ viewer: OTHER });
    expect(resolveViewerPreference("/trending/profiles", { viewer: VIEWER }, undefined)).toEqual({
      viewer: VIEWER,
    });
  });

  it("does not replace an invalid explicit viewer with the cookie", () => {
    expect(resolveViewerPreference("/", { viewer: "not-a-key" }, VIEWER)).toEqual({});
  });

  it("stays put when the cookie is missing or invalid", () => {
    expect(resolveViewerPreference("/", { window: "7d" }, undefined)).toEqual({});
    expect(resolveViewerPreference("/", {}, "not-a-key")).toEqual({});
  });
});

describe("resolveRankingPreference", () => {
  it("puts language and viewer on the URL in one redirect", () => {
    const decision = resolveRankingPreference("/", { window: "7d", offset: "40" }, "de", VIEWER);
    const query = queryOf(decision.redirectTo);
    expect(decision.redirectTo?.startsWith("/?")).toBe(true);
    expect(query.get("lang")).toBe("de");
    expect(query.get("viewer")).toBe(VIEWER);
    expect(query.get("window")).toBe("7d");
    expect(query.get("offset")).toBe("40");
  });

  it("keeps an explicit viewer when only the language cookie redirects", () => {
    const decision = resolveRankingPreference("/trending/notes", { viewer: OTHER }, "ja", VIEWER);
    const query = queryOf(decision.redirectTo);
    expect(query.get("viewer")).toBe(OTHER);
    expect(query.get("lang")).toBe("ja");
    expect(query.get("viewer")).not.toBe(VIEWER);
  });

  it("does not redirect when both values are already on the URL", () => {
    expect(
      resolveRankingPreference("/trending/hashtags", { lang: "de", viewer: VIEWER }, "en", OTHER)
    ).toEqual({
      language: "de",
      viewer: VIEWER,
    });
  });
});
