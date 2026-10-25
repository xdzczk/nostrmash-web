"use client";

import { useEffect } from "react";

import type { DiscoverMode, DiscoverView } from "@/lib/discover/views";
import type { StatsWindow } from "@/lib/search-params/window";
import { recordDiscoverEvent } from "@/lib/telemetry/discover";

export function DiscoverTelemetry({
  view,
  mode,
  window,
  language,
}: {
  view: DiscoverView;
  mode?: DiscoverMode;
  window: StatsWindow;
  language?: string;
}) {
  useEffect(() => {
    recordDiscoverEvent({
      name: "navigation",
      view,
      mode,
      ...(language ? { language } : {}),
    });
    recordDiscoverEvent({ name: "window_change", view, window });
  }, [language, mode, view, window]);

  return null;
}
