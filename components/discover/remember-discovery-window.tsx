"use client";

import { useEffect } from "react";

import {
  serializeDiscoveryWindowPreferenceCookie,
  serializeLastDiscoveryWindowCookie,
} from "@/lib/discover/discovery-window-session";
import { isRelayStatsWindow, type StatsWindow } from "@/lib/search-params/window";

/**
 * Remember the ranking the reader is looking at. 7d and 30d are restored on
 * later Discover visits; 24h clears that preference. The 24h/7d cookie is
 * only the range a rejected 30d can fall back to.
 */
export function RememberDiscoveryWindow({ window }: { window: StatsWindow }) {
  useEffect(() => {
    document.cookie = serializeDiscoveryWindowPreferenceCookie(window);
    if (!isRelayStatsWindow(window)) return;
    document.cookie = serializeLastDiscoveryWindowCookie(window);
  }, [window]);
  return null;
}
