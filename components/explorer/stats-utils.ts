import { isRecord } from "@/components/explorer/utils";
import type { StatsWindow } from "@/lib/search-params/window";
import { preferredMetricKeysForWindow } from "@/lib/search-params/window";

export function classifyStats(value: unknown): {
  primitives: Array<{ label: string; value: string | number | boolean }>;
  objects: Array<{ label: string; value: Record<string, unknown> }>;
  arrays: Array<{ label: string; value: unknown[] }>;
  leftovers: Array<{ label: string; value: unknown }>;
} {
  const primitives: Array<{ label: string; value: string | number | boolean }> = [];
  const objects: Array<{ label: string; value: Record<string, unknown> }> = [];
  const arrays: Array<{ label: string; value: unknown[] }> = [];
  const leftovers: Array<{ label: string; value: unknown }> = [];

  if (!isRecord(value)) {
    return { primitives, objects, arrays, leftovers };
  }

  for (const [label, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      primitives.push({ label, value: entry });
      continue;
    }
    if (Array.isArray(entry)) {
      arrays.push({ label, value: entry });
      continue;
    }
    if (isRecord(entry)) {
      objects.push({ label, value: entry });
      continue;
    }
    leftovers.push({ label, value: entry });
  }

  return { primitives, objects, arrays, leftovers };
}

export function pickRelayEntryByHost(payload: unknown, relayHost: string): unknown {
  const target = normalizeRelayHost(relayHost);
  for (const group of collectRelayStatRowArrays(payload)) {
    for (const row of group) {
      if (!isRecord(row)) continue;
      for (const key of ["relay_url", "url", "host", "relay", "name"]) {
        const value = row[key];
        if (typeof value !== "string") continue;
        const candidate = normalizeRelayHost(value);
        if (candidate === target || value.toLowerCase().includes(target)) {
          return row;
        }
      }
    }
  }
  return null;
}

export interface RelayRowSummary {
  relay: string;
  metrics: Record<string, string | number | boolean>;
}

const RELAY_IDENTIFIER_KEYS = ["relay_url", "url", "host", "relay", "name"] as const;
const RELAY_ACTIVITY_PRIORITY_KEYS = [
  "event_count",
  "events",
  "events_ingested",
  "events_24h",
  "note_count",
  "notes",
  "notes_24h",
  "count",
  "mentions",
  "relay_mentions",
  "request_count",
  "message_count",
  "ingest_count",
  "traffic",
] as const;

function toNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toRelayIdentifier(row: Record<string, unknown>): string {
  const value = RELAY_IDENTIFIER_KEYS.map((key) => row[key]).find(
    (entry) => typeof entry === "string" && entry.trim().length > 0
  );
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRelayHost(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return "";
  const withScheme = trimmed.includes("://") ? trimmed : `wss://${trimmed}`;
  try {
    return new URL(withScheme).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    const fallbackHost = trimmed
      .replace(/^wss?:\/\//, "")
      .replace(/^https?:\/\//, "")
      .split("/")[0];
    return (fallbackHost ?? "").replace(/\.$/, "");
  }
}

function relayActivityScore(metrics: Record<string, string | number | boolean>): number {
  for (const key of RELAY_ACTIVITY_PRIORITY_KEYS) {
    const parsed = toNumeric(metrics[key]);
    if (parsed !== null) return parsed;
  }
  return Object.values(metrics).reduce<number>((sum, value) => {
    const parsed = toNumeric(value);
    return parsed === null ? sum : sum + parsed;
  }, 0);
}

const RELAY_STAT_ROW_ARRAY_KEYS = ["top", "items", "rows", "leaders", "relays", "data"] as const;

function relayRowFromRecord(row: Record<string, unknown>): RelayRowSummary | null {
  const relay = toRelayIdentifier(row);
  if (!relay) return null;

  const metrics = Object.fromEntries(
    Object.entries(row).filter(
      ([key, value]) =>
        !RELAY_IDENTIFIER_KEYS.includes(key as (typeof RELAY_IDENTIFIER_KEYS)[number]) &&
        (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    )
  ) as Record<string, string | number | boolean>;

  return { relay, metrics };
}

function collectRelayStatRowArrays(payload: unknown): unknown[][] {
  if (!isRecord(payload)) return [];

  const groups: unknown[][] = [];
  const seen = new Set<unknown[]>();
  const pushGroup = (value: unknown) => {
    if (!Array.isArray(value) || seen.has(value)) return;
    seen.add(value);
    groups.push(value);
  };

  const { arrays, objects } = classifyStats(payload);
  for (const group of arrays) {
    pushGroup(group.value);
  }

  for (const objectGroup of objects) {
    for (const key of RELAY_STAT_ROW_ARRAY_KEYS) {
      pushGroup(objectGroup.value[key]);
    }
  }

  for (const key of ["relays", "relay_stats", "stats", "items", "data"]) {
    const entry = payload[key];
    if (Array.isArray(entry)) {
      pushGroup(entry);
      continue;
    }
    if (!isRecord(entry)) continue;
    for (const nestedKey of RELAY_STAT_ROW_ARRAY_KEYS) {
      pushGroup(entry[nestedKey]);
    }
  }

  return groups;
}

function parseRelayHealthyFlag(entry: Record<string, unknown>): boolean | undefined {
  if (typeof entry.healthy === "boolean") return entry.healthy;
  if (typeof entry.status !== "string") return undefined;

  const normalized = entry.status.trim().toLowerCase();
  // Keep in sync with relayHealthyFromObservation in lib/api/normalize/relays.ts.
  if (["healthy", "ok", "up", "online", "active"].includes(normalized)) return true;
  if (
    [
      "unhealthy",
      "down",
      "offline",
      "degraded",
      "error",
      "errored",
      "failed",
      "disconnected",
      "backing_off",
    ].includes(normalized)
  ) {
    return false;
  }
  return undefined;
}

export function extractRelayRows(payload: unknown, limit = 20): RelayRowSummary[] {
  const rows: RelayRowSummary[] = [];

  for (const group of collectRelayStatRowArrays(payload)) {
    for (const row of group) {
      if (!isRecord(row)) continue;
      const summary = relayRowFromRecord(row);
      if (!summary) continue;

      rows.push(summary);
      if (rows.length >= limit) {
        return rows;
      }
    }
  }

  return rows;
}

export interface RelayHealthSummary {
  relay: string;
  host: string;
  status?: string;
  healthy?: boolean;
  mode?: string;
  filterGroup?: string;
  lastError?: string;
  latestCheckpointAt?: string | number;
  eoseSeenAt?: string | number;
  lastSeenAt?: string | number;
  details: Record<string, unknown>;
}

function asTimestamp(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") return value;
  return undefined;
}

export function extractRelayHealthRows(payload: unknown, limit = 50): RelayHealthSummary[] {
  if (!isRecord(payload)) return [];
  const candidates = [
    payload.relays,
    payload.relay_health,
    payload.health,
    payload.items,
    payload.data,
  ].find((value) => Array.isArray(value)) as unknown[] | undefined;
  if (!candidates) return [];

  const rows: RelayHealthSummary[] = [];
  for (const entry of candidates) {
    if (typeof entry === "string") {
      const host = normalizeRelayHost(entry);
      if (!host) continue;
      rows.push({ relay: entry.trim(), host, details: {} });
    } else if (isRecord(entry)) {
      const relay = toRelayIdentifier(entry);
      if (!relay) continue;
      const host = normalizeRelayHost(relay);
      if (!host) continue;
      const latestCheckpointAt = asTimestamp(entry.latest_checkpoint_at);
      const lastSeenAt =
        asTimestamp(entry.last_seen_at) ?? asTimestamp(entry.seen_at) ?? latestCheckpointAt;
      rows.push({
        relay,
        host,
        status: typeof entry.status === "string" ? entry.status : undefined,
        healthy: parseRelayHealthyFlag(entry),
        mode: typeof entry.mode === "string" ? entry.mode : undefined,
        filterGroup: typeof entry.filter_group === "string" ? entry.filter_group : undefined,
        lastError: typeof entry.last_error === "string" ? entry.last_error : undefined,
        latestCheckpointAt,
        eoseSeenAt: asTimestamp(entry.eose_seen_at),
        lastSeenAt,
        details: entry,
      });
    }
    if (rows.length >= limit) break;
  }

  return rows;
}

export interface RelayActivitySummary {
  relay: string;
  host: string;
  metrics: Record<string, string | number | boolean>;
  activityScore: number;
  rank: number;
}

export function rankRelayActivity(payload: unknown, limit = 50): RelayActivitySummary[] {
  const rows = extractRelayRows(payload, Math.max(limit * 3, limit));
  const byHost = new Map<string, RelayActivitySummary>();

  for (const row of rows) {
    const host = normalizeRelayHost(row.relay);
    if (!host) continue;
    const candidate: RelayActivitySummary = {
      relay: row.relay,
      host,
      metrics: row.metrics,
      activityScore: relayActivityScore(row.metrics),
      rank: 0,
    };
    const existing = byHost.get(host);
    if (!existing || candidate.activityScore > existing.activityScore) {
      byHost.set(host, candidate);
    }
  }

  return Array.from(byHost.values())
    .sort((left, right) => right.activityScore - left.activityScore)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function relayHealthPosture(rows: RelayHealthSummary[]): {
  total: number;
  healthy: number;
  unhealthy: number;
  unknown: number;
} {
  return rows.reduce(
    (summary, row) => {
      summary.total += 1;
      if (row.healthy === true) summary.healthy += 1;
      else if (row.healthy === false) summary.unhealthy += 1;
      else summary.unknown += 1;
      return summary;
    },
    { total: 0, healthy: 0, unhealthy: 0, unknown: 0 }
  );
}

const STATS_METADATA_KEYS = new Set([
  "consistency",
  "next_cursor",
  "cursor",
  "continuation",
  "generated_at",
  "updated_at",
  "as_of",
  "computed_at",
]);

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

const STATS_WRAPPER_KEYS = ["network", "content", "relays", "stats", "summary", "data"] as const;
const TIME_WINDOW_KEYS = new Set(["24h", "7d", "1h", "30d", "1d"]);

function isPrimitiveStatValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isTimestampStatValue(value: string | number | boolean): boolean {
  if (typeof value === "string") return ISO_TIMESTAMP_PATTERN.test(value.trim());
  return false;
}

function unwrapStatsSources(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) return [];
  const sources: Record<string, unknown>[] = [payload];
  for (const key of STATS_WRAPPER_KEYS) {
    const wrapped = payload[key];
    if (isRecord(wrapped)) {
      sources.push(wrapped);
    }
  }
  return sources;
}

export function flattenPrimitiveStats(
  value: unknown,
  prefix = "",
  depth = 0,
  maxDepth = 5
): Array<{ label: string; value: string | number | boolean }> {
  if (depth > maxDepth || !isRecord(value)) return [];

  const stats: Array<{ label: string; value: string | number | boolean }> = [];
  for (const [key, fieldValue] of Object.entries(value)) {
    if (STATS_METADATA_KEYS.has(key)) continue;

    if (isPrimitiveStatValue(fieldValue)) {
      if (isTimestampStatValue(fieldValue)) continue;
      const label = prefix ? `${prefix}_${key}` : key;
      stats.push({ label, value: fieldValue });
      if (prefix && /_(24h|7d|1h|30d|1d)$/.test(key)) {
        stats.push({ label: key, value: fieldValue });
      }
      continue;
    }

    if (!isRecord(fieldValue)) continue;
    const entries = Object.entries(fieldValue);
    const isTimeWindowObject =
      entries.length > 0 &&
      entries.every(
        ([windowKey, windowValue]) =>
          TIME_WINDOW_KEYS.has(windowKey) && isPrimitiveStatValue(windowValue)
      );

    if (isTimeWindowObject) {
      for (const [windowKey, windowValue] of entries) {
        if (!isPrimitiveStatValue(windowValue)) continue;
        stats.push({ label: `${key}_${windowKey}`, value: windowValue });
      }
      continue;
    }

    stats.push(
      ...flattenPrimitiveStats(fieldValue, prefix ? `${prefix}_${key}` : key, depth + 1, maxDepth)
    );
  }

  return stats;
}

export function filterPrimitiveStatsForWindow(
  stats: Array<{ label: string; value: string | number | boolean }>,
  window: StatsWindow
): Array<{ label: string; value: string | number | boolean }> {
  return stats.filter((stat) => {
    if (stat.label.endsWith(`_${window}`)) return true;
    if (stat.label.endsWith("_24h") || stat.label.endsWith("_7d")) return false;
    if (stat.label === "active_24h") return window === "24h";
    if (stat.label === "active_7d") return window === "7d";
    return true;
  });
}

function filterMetricGroupItemsForWindow(
  items: Array<{ label: string; value: string | number | boolean }>,
  window: StatsWindow
): Array<{ label: string; value: string | number | boolean }> {
  const windowItem = items.find((item) => item.label === window);
  if (windowItem) return [windowItem];
  return filterPrimitiveStatsForWindow(items, window);
}

function sectionMatchesWindow(label: string, window: StatsWindow): boolean {
  return label === window || label.endsWith(`.${window}`);
}

export function collectStatsMetricGroups(
  payload: unknown,
  limit = 3,
  window?: StatsWindow
): Array<{ title: string; items: Array<{ label: string; value: string | number | boolean }> }> {
  const groups: Array<{
    title: string;
    items: Array<{ label: string; value: string | number | boolean }>;
  }> = [];
  const seenTitles = new Set<string>();

  const pushGroup = (title: string, record: Record<string, unknown>) => {
    if (seenTitles.has(title)) return;
    let items = Object.entries(record)
      .filter((entry): entry is [string, string | number | boolean] =>
        isPrimitiveStatValue(entry[1])
      )
      .map(([label, value]) => ({ label, value }));
    if (window) {
      items = filterMetricGroupItemsForWindow(items, window);
    }
    if (items.length === 0) return;
    seenTitles.add(title);
    groups.push({ title, items });
  };

  const inspectRecord = (record: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(record)) {
      if (STATS_METADATA_KEYS.has(key)) continue;
      if (isPrimitiveStatValue(value)) continue;
      if (!isRecord(value)) continue;

      const entries = Object.entries(value);
      const isTimeWindowObject =
        entries.length > 0 &&
        entries.every(
          ([windowKey, windowValue]) =>
            TIME_WINDOW_KEYS.has(windowKey) && isPrimitiveStatValue(windowValue)
        );
      if (isTimeWindowObject) {
        pushGroup(key, Object.fromEntries(entries) as Record<string, string | number | boolean>);
        continue;
      }

      pushGroup(key, value);
      for (const [nestedKey, nestedValue] of entries) {
        if (!isRecord(nestedValue)) continue;
        const nestedEntries = Object.entries(nestedValue);
        const nestedTimeWindowObject =
          nestedEntries.length > 0 &&
          nestedEntries.every(
            ([windowKey, windowValue]) =>
              TIME_WINDOW_KEYS.has(windowKey) && isPrimitiveStatValue(windowValue)
          );
        if (nestedTimeWindowObject) {
          pushGroup(
            `${key}_${nestedKey}`,
            Object.fromEntries(nestedEntries) as Record<string, string | number | boolean>
          );
        }
      }
    }
  };

  for (const source of unwrapStatsSources(payload)) {
    inspectRecord(source);
    if (groups.length >= limit) break;
  }

  return groups.slice(0, limit);
}

export function collectStatsArraySections(
  payload: unknown,
  limit = 2,
  window?: StatsWindow
): Array<{ label: string; value: unknown[] }> {
  const sections: Array<{ label: string; value: unknown[] }> = [];
  const seen = new Set<unknown[]>();

  const pushSection = (label: string, value: unknown[]) => {
    if (seen.has(value)) return;
    seen.add(value);
    sections.push({ label, value });
  };

  const formatSectionLabel = (parts: string[]) => {
    const normalized =
      parts[0] && STATS_WRAPPER_KEYS.includes(parts[0] as (typeof STATS_WRAPPER_KEYS)[number])
        ? parts.slice(1)
        : parts;
    return normalized.join(".");
  };

  for (const source of unwrapStatsSources(payload)) {
    const classified = classifyStats(source);
    for (const group of classified.arrays) {
      pushSection(group.label, group.value);
    }

    for (const objectGroup of classified.objects) {
      for (const [key, value] of Object.entries(objectGroup.value)) {
        if (Array.isArray(value)) {
          pushSection(formatSectionLabel([objectGroup.label, key]), value);
          continue;
        }
        if (!isRecord(value)) continue;
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (Array.isArray(nestedValue)) {
            pushSection(formatSectionLabel([objectGroup.label, key, nestedKey]), nestedValue);
          }
        }
      }
    }
  }

  const filtered = window
    ? sections.filter((section) => sectionMatchesWindow(section.label, window))
    : sections;

  return (filtered.length > 0 ? filtered : sections).slice(0, limit);
}

export function pickTopPrimitiveStats(
  payload: unknown,
  preferredKeys: string[],
  limit = 6,
  window?: StatsWindow
): Array<{ label: string; value: string | number | boolean }> {
  const resolvedPreferredKeys = window
    ? preferredMetricKeysForWindow(preferredKeys, window)
    : preferredKeys;
  let primitives = Array.from(
    new Map(
      unwrapStatsSources(payload)
        .flatMap((source) => flattenPrimitiveStats(source))
        .map((entry) => [entry.label, entry] as const)
    ).values()
  );
  if (window) {
    primitives = filterPrimitiveStatsForWindow(primitives, window);
  }
  if (primitives.length === 0) return [];

  const byKey = new Map(primitives.map((entry) => [entry.label, entry]));
  const selected: Array<{ label: string; value: string | number | boolean }> = [];
  const seen = new Set<string>();

  const isActiveAuthorsKey = (label: string) => /(^|_)active_authors(?:_|$)/.test(label);
  const isUniqueAuthorsKey = (label: string) => /(^|_)unique_authors(?:_|$)/.test(label);
  const isComputedAtKey = (label: string) =>
    label === "computed_at" || label.endsWith("_computed_at");

  for (const key of resolvedPreferredKeys) {
    const stat = byKey.get(key);
    if (!stat) continue;
    if (isComputedAtKey(stat.label) || isTimestampStatValue(stat.value)) continue;
    if (
      isUniqueAuthorsKey(stat.label) &&
      selected.some((entry) => isActiveAuthorsKey(entry.label))
    ) {
      continue;
    }
    selected.push(stat);
    seen.add(key);
    if (selected.length >= limit) return selected;
  }

  const hasActiveAuthors = selected.some((stat) => isActiveAuthorsKey(stat.label));

  for (const stat of primitives) {
    if (seen.has(stat.label)) continue;
    if (isComputedAtKey(stat.label) || isTimestampStatValue(stat.value)) continue;
    if (hasActiveAuthors && isUniqueAuthorsKey(stat.label)) continue;
    selected.push(stat);
    if (selected.length >= limit) break;
  }

  return selected;
}
