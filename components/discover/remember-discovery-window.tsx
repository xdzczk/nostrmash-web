"use client";

import { useEffect } from "react";

import { serializeLastDiscoveryWindowCookie } from "@/lib/discover/discovery-window-session";
import { isRelayStatsWindow, type StatsWindow } from "@/lib/search-params/window";

/** Remember the last 24h/7d range so a rejected 30d can return to it. */
export function RememberDiscoveryWindow({ window }: { window: StatsWindow }) {
  useEffect(() => {
    if (!isRelayStatsWindow(window)) return;
    document.cookie = serializeLastDiscoveryWindowCookie(window);
  }, [window]);
  return null;
}
