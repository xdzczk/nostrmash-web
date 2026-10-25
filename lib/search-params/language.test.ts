import { describe, expect, it } from "vitest";

import {
  LANGUAGE_COOKIE,
  LANGUAGE_COOKIE_MAX_AGE,
  buildDiscoverHref,
  buildLanguageHref,
  languageCookieMutation,
  parseLanguage,
  resolveLanguagePreference,
  selectLanguageOptions,
  serializeLanguageCookie,
} from "./language";

describe("parseLanguage", () => {
  it("accepts lowercase ISO 639-1/639-2 codes and rejects everything else", () => {
    expect(parseLanguage(undefined)).toBeUndefined();
    expect(parseLanguage("")).toBeUndefined();
    expect(parseLanguage("en")).toBe("en");
    expect(parseLanguage(" de ")).toBe("de");
    expect(parseLanguage("ja")).toBe("ja");
    expect(parseLanguage("und")).toBe("und");
    expect(parseLanguage("EN")).toBeUndefined();
    expect(parseLanguage("e")).toBeUndefined();
    expect(parseLanguage("engl")).toBeUndefined();
    expect(parseLanguage("en-us")).toBeUndefined();
    expect(parseLanguage("und-uncertain")).toBeUndefined();
  });
});

describe("buildLanguageHref", () => {
  it("adds lang and clears pagination while preserving window", () => {
    const current = new URLSearchParams("window=7d&cursor=abc&offset=20&health_cursor=h");
    expect(buildLanguageHref("/trending/notes", current, "de")).toBe(
      "/trending/notes?window=7d&lang=de"
    );
  });

  it("removes lang for all languages and preserves window", () => {
    const current = new URLSearchParams("window=7d&lang=de&cursor=abc");
    expect(buildLanguageHref("/trending/notes", current, undefined)).toBe(
      "/trending/notes?window=7d"
    );
  });

  it("drops the query when neither window nor lang remains", () => {
    expect(buildLanguageHref("/", new URLSearchParams("lang=ja"), undefined)).toBe("/");
    expect(buildLanguageHref("/", new URLSearchParams(), "ja")).toBe("/?lang=ja");
  });
});

describe("buildDiscoverHref", () => {
  it("keeps the tab link shape and carries lang", () => {
    expect(buildDiscoverHref("/trending/profiles", { window: "24h" })).toBe(
      "/trending/profiles?window=24h"
    );
    expect(buildDiscoverHref("/trending/profiles", { window: "7d", lang: "de" })).toBe(
      "/trending/profiles?window=7d&lang=de"
    );
    expect(buildDiscoverHref("/", {})).toBe("/");
    expect(buildDiscoverHref("/", { lang: "ja" })).toBe("/?lang=ja");
  });
});

describe("language cookie helper", () => {
  it("stores a chosen language for one year", () => {
    expect(languageCookieMutation("de")).toEqual({
      action: "set",
      name: LANGUAGE_COOKIE,
      value: "de",
      options: { maxAge: LANGUAGE_COOKIE_MAX_AGE, sameSite: "lax", path: "/" },
    });
    expect(LANGUAGE_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
    expect(serializeLanguageCookie("de")).toBe(
      `${LANGUAGE_COOKIE}=de; Max-Age=${LANGUAGE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`
    );
  });

  it("clears the cookie for all languages and invalid codes", () => {
    expect(languageCookieMutation(undefined)).toEqual({ action: "clear", name: LANGUAGE_COOKIE });
    expect(languageCookieMutation("und-uncertain").action).toBe("clear");
    expect(serializeLanguageCookie(undefined)).toBe(
      `${LANGUAGE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
    );
  });

  it("redirects to the same URL with lang when the cookie is set and the query is not", () => {
    expect(
      resolveLanguagePreference("/trending/notes", { window: "7d", cursor: "abc" }, "de")
    ).toEqual({
      redirectTo: "/trending/notes?window=7d&cursor=abc&lang=de",
    });
  });

  it("lets an explicit lang param win over the cookie", () => {
    expect(resolveLanguagePreference("/", { lang: "ja" }, "de")).toEqual({ language: "ja" });
  });

  it("ignores an invalid cookie and an invalid lang param", () => {
    expect(resolveLanguagePreference("/", {}, "und-uncertain")).toEqual({});
    expect(resolveLanguagePreference("/", { lang: "english" }, undefined)).toEqual({});
    expect(resolveLanguagePreference("/", { lang: "nope" }, "fr")).toEqual({
      redirectTo: "/?lang=fr",
    });
  });
});

describe("selectLanguageOptions", () => {
  it("orders by count and drops unmarked codes", () => {
    expect(
      selectLanguageOptions([
        { language: "ja", count: 10 },
        { language: "und", count: 100 },
        { language: "de", count: 50 },
        { language: "und-uncertain", count: 40 },
      ])
    ).toEqual([
      { language: "de", count: 50 },
      { language: "ja", count: 10 },
    ]);
  });
});
