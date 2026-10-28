import { readSearchParam, type RouteSearchParams } from "@/lib/search-params/pagination";

export type StatsWindow = "24h" | "7d" | "30d";

export const STATS_WINDOWS: StatsWindow[] = ["24h", "7d", "30d"];

/**
 * Windows the relay stats API accepts. `sections.network_summary.relays`
 * has these keys only — there is no 30d relay bucket.
 */
export const RELAY_STATS_WINDOWS = ["24h", "7d"] as const satisfies readonly StatsWindow[];

export type RelayStatsWindow = (typeof RELAY_STATS_WINDOWS)[number];

export const DEFAULT_STATS_WINDOW: StatsWindow = "24h";

const WINDOW_SUFFIX = /_(24h|7d|30d)$/;

/** Relay leaderboard / volume labels. These must not be rewritten to `_30d`. */
const RELAY_WINDOW_STAT =
  /^(?:network_relays_active|relays_active|relays_event_volume|event_volume|active)_(24h|7d|30d)$/;

export function isStatsWindow(value: string | undefined): value is StatsWindow {
  return typeof value === "string" && (STATS_WINDOWS as readonly string[]).includes(value);
}

export function isRelayStatsWindow(value: string | undefined): value is RelayStatsWindow {
  return value === "24h" || value === "7d";
}

export function parseStatsWindow(value: string | undefined): StatsWindow {
  return isStatsWindow(value) ? value : DEFAULT_STATS_WINDOW;
}

export function readStatsWindow(params: RouteSearchParams): StatsWindow {
  return parseStatsWindow(readSearchParam(params, "window"));
}

/** Relay pages keep today's 24h/7d parsing. `window=30d` stays on the default. */
export function readRelayStatsWindow(params: RouteSearchParams): RelayStatsWindow {
  const value = readSearchParam(params, "window");
  return value === "7d" ? "7d" : "24h";
}

/** Relay requests and relay numbers stay on 24h or 7d when discovery is on 30d. */
export function relayStatsWindow(window: StatsWindow): RelayStatsWindow {
  return window === "30d" ? "24h" : window;
}

export function isRelayWindowStatLabel(label: string): boolean {
  return RELAY_WINDOW_STAT.test(label);
}

export function selectableStatsWindows(monthAvailable: boolean): readonly StatsWindow[] {
  return monthAvailable ? STATS_WINDOWS : RELAY_STATS_WINDOWS;
}

/**
 * After `window=30d` is rejected with HTTP 400, hide that option and ask
 * again with the previous 24h/7d range.
 */
export function fallbackAfterRejected30d(
  requested: StatsWindow,
  previous: RelayStatsWindow,
  status: number | null
): { window: StatsWindow; hide30d: boolean } {
  if (requested === "30d" && status === 400) {
    return { window: previous, hide30d: true };
  }
  return { window: requested, hide30d: false };
}

export function formatStatsWindowLabel(
  window: StatsWindow,
  style: "short" | "long" = "long"
): string {
  if (style === "short") return window;
  if (window === "7d") return "Last 7 days";
  if (window === "30d") return "Last 30 days";
  return "Last 24 hours";
}

/** Homepage eyebrow. Matches the short control: Today / This week / This month. */
export function formatDiscoveryWindowEyebrow(window: StatsWindow): string {
  if (window === "7d") return "This week";
  if (window === "30d") return "This month";
  return "Today";
}

/** "24 hours" / "7 days" / "30 days" for sentences that name the range. */
export function formatStatsWindowLength(window: StatsWindow): string {
  if (window === "7d") return "7 days";
  if (window === "30d") return "30 days";
  return "24 hours";
}

/** "in the last day" / "in the last 7 days" / "in the last 30 days". */
export function formatStatsWindowSpan(window: StatsWindow): string {
  if (window === "7d") return "in the last 7 days";
  if (window === "30d") return "in the last 30 days";
  return "in the last day";
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
  const relayWindow = relayStatsWindow(window);
  return keys.map((key) => {
    if (!WINDOW_SUFFIX.test(key)) return key;
    const target = isRelayWindowStatLabel(key) ? relayWindow : window;
    return key.replace(WINDOW_SUFFIX, `_${target}`);
  });
}

/**
 * Preferred Network Pulse metrics, in display order. The first four form the
 * default 2×2 strip (authors, notes, active relays, relay event volume); the
 * remaining keys are fallbacks for older stats payloads that lack them.
 */
export function networkPulsePreferredKeys(window: StatsWindow): string[] {
  return [
    `active_authors_${window}`,
    `note_volume_${window}`,
    `network_relays_active_${window}`,
    `relays_active_${window}`,
    `active_${window}`,
    `event_volume_${window}`,
    "events_ingested",
    "projected_profiles",
  ];
}

/** Number of tiles the homepage Network Pulse strip shows. */
export const NETWORK_PULSE_TILE_LIMIT = 4;

export function resolveApiWindow(payload: unknown, fallback: StatsWindow): StatsWindow {
  if (typeof payload === "object" && payload !== null) {
    const candidate = (payload as Record<string, unknown>).window;
    if (typeof candidate === "string" && isStatsWindow(candidate)) return candidate;
  }
  return fallback;
}
