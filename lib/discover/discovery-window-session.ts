import type { RelayStatsWindow } from "@/lib/search-params/window";

/** Session cookie. Set after `window=30d` is rejected so the option stays hidden. */
export const DISCOVERY_30D_HIDDEN_COOKIE = "nm_no_30d";

/** Session cookie. Last discovery range that was not a rejected 30d. */
export const DISCOVERY_LAST_WINDOW_COOKIE = "nm_window";

export function serializeLastDiscoveryWindowCookie(window: RelayStatsWindow): string {
  return `${DISCOVERY_LAST_WINDOW_COOKIE}=${window}; Path=/; SameSite=Lax`;
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
