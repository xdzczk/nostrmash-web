import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { isApiError } from "@/lib/api/errors";
import {
  DISCOVERY_30D_HIDDEN_COOKIE,
  DISCOVERY_LAST_WINDOW_COOKIE,
  DISCOVERY_WINDOW_PREFERENCE_COOKIE,
  parseDiscoveryWindowPreference,
  unsupportedDiscoveryWindowHref,
} from "@/lib/discover/discovery-window-session";
import {
  readSearchParam,
  toUrlSearchParams,
  type RouteSearchParams,
} from "@/lib/search-params/pagination";
import {
  buildWindowHref,
  fallbackAfterRejected30d,
  isRelayStatsWindow,
  isStatsWindow,
  readStatsWindow,
  type RelayStatsWindow,
  type StatsWindow,
} from "@/lib/search-params/window";

export {
  DISCOVERY_30D_HIDDEN_COOKIE,
  DISCOVERY_LAST_WINDOW_COOKIE,
  DISCOVERY_WINDOW_PREFERENCE_COOKIE,
  safeInternalPath,
  serializeDiscoveryWindowPreferenceCookie,
  serializeLastDiscoveryWindowCookie,
  unsupportedDiscoveryWindowHref,
} from "@/lib/discover/discovery-window-session";

export async function isDiscovery30dHidden(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(DISCOVERY_30D_HIDDEN_COOKIE)?.value === "1";
}

/**
 * Previous 24h/7d range: the session cookie when the selector recorded one,
 * otherwise the Referer query (the page the reader just left), otherwise 24h.
 */
export async function lastDiscoveryWindow(): Promise<RelayStatsWindow> {
  const jar = await cookies();
  const saved = jar.get(DISCOVERY_LAST_WINDOW_COOKIE)?.value;
  if (isRelayStatsWindow(saved)) return saved;

  const referer = (await headers()).get("referer");
  if (referer) {
    try {
      const from = new URL(referer).searchParams.get("window");
      if (from === "7d") return "7d";
    } catch {
      // Ignore a malformed Referer and use the default range.
    }
  }
  return "24h";
}

/**
 * Where to send a Discover URL that omitted `window`, so a saved 7d or 30d
 * comes back the way a saved language does. An explicit `window` wins.
 * Pagination stays; choosing a range in the selector is what clears it.
 * A saved 30d is skipped once this session knows the index rejected it.
 */
export function discoveryWindowPreferenceHref(
  path: string,
  params: RouteSearchParams,
  preference: string | undefined,
  monthHidden: boolean,
  previous: RelayStatsWindow
): string | null {
  if (isStatsWindow(readSearchParam(params, "window"))) return null;
  const saved = parseDiscoveryWindowPreference(preference);
  if (!saved) return null;
  const window = saved === "30d" && monthHidden ? previous : saved;
  if (window === "24h") return null;
  const next = toUrlSearchParams(params);
  next.set("window", window);
  const query = next.toString();
  return query.length > 0 ? `${path}?${query}` : path;
}

/**
 * Restore a saved ranking window, then leave a rejected `window=30d` for the
 * previous 24h/7d range.
 */
export async function syncDiscoveryWindow(
  path: string,
  params: RouteSearchParams
): Promise<StatsWindow> {
  const monthHidden = await isDiscovery30dHidden();
  if (!isStatsWindow(readSearchParam(params, "window"))) {
    const jar = await cookies();
    const saved = parseDiscoveryWindowPreference(
      jar.get(DISCOVERY_WINDOW_PREFERENCE_COOKIE)?.value
    );
    const previous = saved === "30d" && monthHidden ? await lastDiscoveryWindow() : "24h";
    const href = discoveryWindowPreferenceHref(path, params, saved, monthHidden, previous);
    if (href) redirect(href);
  }

  const requested = readStatsWindow(params);
  if (requested !== "30d" || !monthHidden) return requested;
  const fallback = await lastDiscoveryWindow();
  redirect(buildWindowHref(path, toUrlSearchParams(params), fallback));
}

/**
 * Run a discovery read. A 400 on `window=30d` redirects through the session
 * cookie route and the next request uses the previous range.
 */
export async function requestDiscovery<T>(
  window: StatsWindow,
  path: string,
  params: URLSearchParams,
  run: (window: StatsWindow) => Promise<T>
): Promise<T> {
  try {
    return await run(window);
  } catch (error) {
    const status = isApiError(error) ? error.status : null;
    if (!fallbackAfterRejected30d(window, "24h", status).hide30d) throw error;
  }
  const previous = await lastDiscoveryWindow();
  redirect(unsupportedDiscoveryWindowHref(buildWindowHref(path, params, previous)));
}
