import {
  readSearchParam,
  toUrlSearchParams,
  type RouteSearchParams,
} from "@/lib/search-params/pagination";
import type { StatsWindow } from "@/lib/search-params/window";

export const LANGUAGE_COOKIE = "nm_lang";

/** One year, in seconds. */
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LANGUAGE_EMPTY_MESSAGE = "Not enough notes in this language yet";

/** Chart buckets that are not selectable languages. */
export const EXCLUDED_LANGUAGE_CODES = new Set(["und", "und-uncertain"]);

const LANGUAGE_PATTERN = /^[a-z]{2,3}$/;

export function parseLanguage(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const candidate = value.trim();
  return LANGUAGE_PATTERN.test(candidate) ? candidate : undefined;
}

export function readLanguage(params: RouteSearchParams): string | undefined {
  return parseLanguage(readSearchParam(params, "lang"));
}

export function buildLanguageHref(
  path: string,
  current: URLSearchParams,
  lang: string | undefined
): string {
  const next = new URLSearchParams(current);
  if (lang) next.set("lang", lang);
  else next.delete("lang");
  next.delete("cursor");
  next.delete("health_cursor");
  next.delete("offset");
  const query = next.toString();
  return query.length > 0 ? `${path}?${query}` : path;
}

/**
 * Discover tab and mode links. Keeps today's `?window=` shape (including the
 * default 24h value those links already emit) and carries `lang` when set.
 */
export function buildDiscoverHref(
  path: string,
  options: { window?: StatsWindow; lang?: string }
): string {
  const next = new URLSearchParams();
  if (options.window) next.set("window", options.window);
  if (options.lang) next.set("lang", options.lang);
  const query = next.toString();
  return query.length > 0 ? `${path}?${query}` : path;
}

export type LanguageCookieOptions = {
  maxAge: number;
  sameSite: "lax";
  path: "/";
};

export type LanguageCookieMutation =
  | { action: "set"; name: string; value: string; options: LanguageCookieOptions }
  | { action: "clear"; name: string };

/** Cookie write for a chosen language. `undefined` clears `nm_lang` ("All languages"). */
export function languageCookieMutation(lang: string | undefined): LanguageCookieMutation {
  const parsed = parseLanguage(lang);
  if (!parsed) return { action: "clear", name: LANGUAGE_COOKIE };
  return {
    action: "set",
    name: LANGUAGE_COOKIE,
    value: parsed,
    options: {
      maxAge: LANGUAGE_COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    },
  };
}

export function serializeLanguageCookie(lang: string | undefined): string {
  const mutation = languageCookieMutation(lang);
  if (mutation.action === "clear") {
    return `${LANGUAGE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
  return `${LANGUAGE_COOKIE}=${mutation.value}; Max-Age=${mutation.options.maxAge}; Path=/; SameSite=Lax`;
}

export type LanguagePreference = {
  language?: string;
  /** Present when the cookie should restore `lang` onto this request's URL. */
  redirectTo?: string;
};

/**
 * The query param wins. With no `lang` param, a valid `nm_lang` cookie redirects
 * to the same path and query plus `lang`. Pagination is preserved here; the
 * selector uses `buildLanguageHref`, which clears it.
 */
export function resolveLanguagePreference(
  path: string,
  params: RouteSearchParams,
  cookieValue: string | undefined
): LanguagePreference {
  const fromQuery = readLanguage(params);
  if (fromQuery) return { language: fromQuery };

  const fromCookie = parseLanguage(cookieValue);
  if (!fromCookie) return {};

  const next = toUrlSearchParams(params);
  next.delete("lang");
  next.set("lang", fromCookie);
  const query = next.toString();
  return { redirectTo: query.length > 0 ? `${path}?${query}` : path };
}

export function selectLanguageOptions(
  rows: Array<{ language: string; count: number }> | undefined,
  active?: string
): Array<{ language: string; count: number }> {
  const options = (rows ?? [])
    .filter(
      (row) =>
        parseLanguage(row.language) === row.language && !EXCLUDED_LANGUAGE_CODES.has(row.language)
    )
    .slice()
    .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language));

  if (
    active &&
    parseLanguage(active) === active &&
    !options.some((row) => row.language === active)
  ) {
    options.push({ language: active, count: 0 });
  }
  return options;
}
