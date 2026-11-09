import {
  readSearchParam,
  toUrlSearchParams,
  type RouteSearchParams,
} from "@/lib/search-params/pagination";
import type { StatsWindow } from "@/lib/search-params/window";

export const LANGUAGE_COOKIE = "nm_lang";

/**
 * Sentinel for "every language". The API ranks every language when `lang` is
 * omitted, so this value is stored in the cookie and never sent upstream.
 * Accept-Language is not consulted; only this explicit choice is.
 */
export const ALL_LANGUAGES = "all";

/** One year, in seconds. */
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LANGUAGE_EMPTY_MESSAGE = "Not enough notes in this language yet";

/** Chart buckets that are not selectable languages. */
export const EXCLUDED_LANGUAGE_CODES = new Set(["und", "und-uncertain"]);

const LANGUAGE_PATTERN = /^[a-z]{2,3}$/;

/** Codes that look like languages but are not selectable rankings. */
const RESERVED_LANGUAGE_CODES = new Set([ALL_LANGUAGES, "und", "und-uncertain"]);

export function parseLanguage(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const candidate = value.trim().toLowerCase();
  if (!LANGUAGE_PATTERN.test(candidate) || RESERVED_LANGUAGE_CODES.has(candidate)) {
    return undefined;
  }
  return candidate;
}

export function isAllLanguagesValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === ALL_LANGUAGES;
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
  const parsed = parseLanguage(lang);
  if (parsed) next.set("lang", parsed);
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

/**
 * Cookie write for a chosen language. "All languages" stores `all` so a later
 * visit does not invent a language. Anything that is not a language code clears it.
 */
export function languageCookieMutation(lang: string | undefined): LanguageCookieMutation {
  if (lang === undefined || isAllLanguagesValue(lang)) {
    return {
      action: "set",
      name: LANGUAGE_COOKIE,
      value: ALL_LANGUAGES,
      options: {
        maxAge: LANGUAGE_COOKIE_MAX_AGE,
        sameSite: "lax",
        path: "/",
      },
    };
  }
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
 * The query param wins. `lang=all` is the explicit every-language view and is
 * canonicalized by dropping the param (the API omits `lang` for that ranking).
 * With no `lang` param, a saved language cookie redirects to the same path.
 * A missing cookie, or a cookie of `all`, stays on the unscoped URL.
 * Accept-Language is never read.
 */
export function resolveLanguagePreference(
  path: string,
  params: RouteSearchParams,
  cookieValue: string | undefined
): LanguagePreference {
  const raw = readSearchParam(params, "lang");
  if (isAllLanguagesValue(raw)) {
    const next = toUrlSearchParams(params);
    next.delete("lang");
    const query = next.toString();
    return { redirectTo: query.length > 0 ? `${path}?${query}` : path };
  }

  const fromQuery = parseLanguage(raw);
  if (fromQuery) return { language: fromQuery };

  if (isAllLanguagesValue(cookieValue)) return {};
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
