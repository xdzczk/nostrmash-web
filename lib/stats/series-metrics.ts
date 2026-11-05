export const STATS_SERIES_METRICS = [
  "note_volume",
  "active_authors",
  "relay_events",
  "zap_count_24h",
  "sats_24h",
  "new_authors_24h",
  "nip17_dm_count_24h",
  "bridged_share_bps",
  "group_messages_24h",
  "poll_votes_24h",
  "live_chat_24h",
  "reports_24h",
  "deletions_24h",
  "labels_24h",
  "census_events_24h",
] as const;

export type StatsSeriesMetric = (typeof STATS_SERIES_METRICS)[number];

/** Shown when `/stats` has no `series` query param. */
export const DEFAULT_STATS_SERIES_METRIC: StatsSeriesMetric = "zap_count_24h";

export const STATS_SERIES_METRIC_LABELS: Record<StatsSeriesMetric, string> = {
  note_volume: "Note volume",
  active_authors: "Active authors",
  relay_events: "Relay events",
  zap_count_24h: "Zap count",
  sats_24h: "Sats",
  new_authors_24h: "New authors",
  nip17_dm_count_24h: "NIP-17 messages",
  bridged_share_bps: "Bridged share",
  group_messages_24h: "Group messages",
  poll_votes_24h: "Poll votes",
  live_chat_24h: "Live chat",
  reports_24h: "Reports",
  deletions_24h: "Deletions",
  labels_24h: "Labels",
  census_events_24h: "Census events",
};

export function isStatsSeriesMetric(value: string | undefined): value is StatsSeriesMetric {
  return typeof value === "string" && (STATS_SERIES_METRICS as readonly string[]).includes(value);
}

export function parseStatsSeriesMetric(value: string | undefined): StatsSeriesMetric {
  return isStatsSeriesMetric(value) ? value : DEFAULT_STATS_SERIES_METRIC;
}
