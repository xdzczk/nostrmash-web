"use client";

import { useEffect } from "react";

import type { DiscoverMode, DiscoverView } from "@/lib/discover/views";
import type { StatsWindow } from "@/lib/search-params/window";
import { recordDiscoverEvent } from "@/lib/telemetry/discover";

export function DiscoverTelemetry({
  view,
  mode,
  window,
}: {
  view: DiscoverView;
  mode?: DiscoverMode;
  window: StatsWindow;
}) {
  useEffect(() => {
    recordDiscoverEvent({ name: "navigation", view, mode });
    recordDiscoverEvent({ name: "window_change", view, window });
  }, [mode, view, window]);

  return null;
}
