import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { isApiError } from "@/lib/api/errors";
import {
  DISCOVERY_30D_HIDDEN_COOKIE,
  DISCOVERY_LAST_WINDOW_COOKIE,
  unsupportedDiscoveryWindowHref,
} from "@/lib/discover/discovery-window-session";
import { toUrlSearchParams, type RouteSearchParams } from "@/lib/search-params/pagination";
import {
  buildWindowHref,
  fallbackAfterRejected30d,
  isRelayStatsWindow,
  readStatsWindow,
  type RelayStatsWindow,
  type StatsWindow,
} from "@/lib/search-params/window";

export {
  DISCOVERY_30D_HIDDEN_COOKIE,
  DISCOVERY_LAST_WINDOW_COOKIE,
  safeInternalPath,
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
 * When this session already learned that 30d is unsupported, leave `?window=30d`
 * and render the previous range instead.
 */
export async function syncDiscoveryWindow(
  path: string,
  params: RouteSearchParams
): Promise<StatsWindow> {
  const requested = readStatsWindow(params);
  if (requested !== "30d" || !(await isDiscovery30dHidden())) return requested;
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
