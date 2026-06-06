import { readSearchParam, type RouteSearchParams } from "@/lib/search-params/pagination";

export type StatsWindow = "24h" | "7d";

export const STATS_WINDOWS: StatsWindow[] = ["24h", "7d"];

export const DEFAULT_STATS_WINDOW: StatsWindow = "24h";

export function parseStatsWindow(value: string | undefined): StatsWindow {
  return value === "7d" ? "7d" : "24h";
}

export function readStatsWindow(params: RouteSearchParams): StatsWindow {
  return parseStatsWindow(readSearchParam(params, "window"));
}

export function formatStatsWindowLabel(
  window: StatsWindow,
  style: "short" | "long" = "long"
): string {
  if (style === "short") return window;
  return window === "7d" ? "Last 7 days" : "Last 24 hours";
}

export function buildWindowHref(
  path: string,
  current: URLSearchParams,
  window: StatsWindow
): string {
  const next = new URLSearchParams(current);
  if (window === DEFAULT_STATS_WINDOW) {
    next.delete("window");
  } else {
    next.set("window", window);
  }
  next.delete("cursor");
  next.delete("health_cursor");
  next.delete("offset");
  const query = next.toString();
  return query.length > 0 ? `${path}?${query}` : path;
}

export function preferredMetricKeysForWindow(keys: string[], window: StatsWindow): string[] {
  return keys.map((key) => {
    if (/_((24h|7d))$/.test(key)) {
      return key.replace(/_(24h|7d)$/, `_${window}`);
    }
    if (key === "active_24h" || key === "active_7d") {
      return window === "7d" ? "active_7d" : "active_24h";
    }
    return key;
  });
}

export function networkPulsePreferredKeys(window: StatsWindow): string[] {
  return [
    "events_ingested",
    "projected_profiles",
    `active_authors_${window}`,
    `note_volume_${window}`,
    window === "7d" ? "active_7d" : "active_24h",
    `unique_authors_${window}`,
  ];
}

export function resolveApiWindow(payload: unknown, fallback: StatsWindow): StatsWindow {
  if (typeof payload === "object" && payload !== null) {
    const window = (payload as Record<string, unknown>).window;
    if (window === "24h" || window === "7d") return window;
  }
  return fallback;
}
