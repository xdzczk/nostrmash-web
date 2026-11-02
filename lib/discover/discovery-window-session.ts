import type { RelayStatsWindow, StatsWindow } from "@/lib/search-params/window";

/** Session cookie. Set after `window=30d` is rejected so the option stays hidden. */
export const DISCOVERY_30D_HIDDEN_COOKIE = "nm_no_30d";

/** Session cookie. Last discovery range that was not a rejected 30d. */
export const DISCOVERY_LAST_WINDOW_COOKIE = "nm_window";

/**
 * Chosen 7d or 30d ranking, kept for a year the same way `nm_lang` keeps a
 * language. 24h is the default and clears this cookie.
 */
export const DISCOVERY_WINDOW_PREFERENCE_COOKIE = "nm_win";

/** One year, in seconds. Matches the language preference. */
export const DISCOVERY_WINDOW_PREFERENCE_MAX_AGE = 60 * 60 * 24 * 365;

export function serializeLastDiscoveryWindowCookie(window: RelayStatsWindow): string {
  return `${DISCOVERY_LAST_WINDOW_COOKIE}=${window}; Path=/; SameSite=Lax`;
}

export function parseDiscoveryWindowPreference(
  value: string | undefined
): Exclude<StatsWindow, "24h"> | undefined {
  return value === "7d" || value === "30d" ? value : undefined;
}

export function serializeDiscoveryWindowPreferenceCookie(window: StatsWindow): string {
  if (window === "24h") {
    return `${DISCOVERY_WINDOW_PREFERENCE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
  return `${DISCOVERY_WINDOW_PREFERENCE_COOKIE}=${window}; Max-Age=${DISCOVERY_WINDOW_PREFERENCE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function unsupportedDiscoveryWindowHref(nextPath: string): string {
  return `/api/discovery-window/unsupported?next=${encodeURIComponent(nextPath)}`;
}

/** Only same-origin relative paths. Anything else falls back to the homepage. */
export function safeInternalPath(raw: string | null): string {
  if (!raw) return "/";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return "/";
  }
  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    decoded.includes("://")
  ) {
    return "/";
  }
  return decoded;
}
