import { isRecord } from "@/components/explorer/utils";

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
  const { arrays } = classifyStats(payload);
  for (const group of arrays) {
    for (const row of group.value) {
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

export function extractRelayRows(payload: unknown, limit = 20): RelayRowSummary[] {
  const { arrays } = classifyStats(payload);
  const rows: RelayRowSummary[] = [];

  for (const group of arrays) {
    for (const row of group.value) {
      if (!isRecord(row)) continue;
      const relay = toRelayIdentifier(row);
      if (!relay) continue;

      const metrics = Object.fromEntries(
        Object.entries(row).filter(
          ([key, value]) =>
            !RELAY_IDENTIFIER_KEYS.includes(key as (typeof RELAY_IDENTIFIER_KEYS)[number]) &&
            (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        )
      ) as Record<string, string | number | boolean>;

      rows.push({ relay, metrics });
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
  latencyMs?: number;
  uptime?: number | string;
  lastSeenAt?: string | number;
  details: Record<string, unknown>;
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
      rows.push({
        relay,
        host,
        status: typeof entry.status === "string" ? entry.status : undefined,
        healthy: typeof entry.healthy === "boolean" ? entry.healthy : undefined,
        latencyMs: toNumeric(entry.latency_ms) ?? undefined,
        uptime: (toNumeric(entry.uptime) ??
          (typeof entry.uptime === "string" ? entry.uptime : undefined)) as
          | number
          | string
          | undefined,
        lastSeenAt:
          typeof entry.last_seen_at === "string" || typeof entry.last_seen_at === "number"
            ? entry.last_seen_at
            : typeof entry.seen_at === "string" || typeof entry.seen_at === "number"
              ? entry.seen_at
              : undefined,
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

export function pickTopPrimitiveStats(
  payload: unknown,
  preferredKeys: string[],
  limit = 6
): Array<{ label: string; value: string | number | boolean }> {
  const { primitives } = classifyStats(payload);
  if (primitives.length === 0) return [];

  const byKey = new Map(primitives.map((entry) => [entry.label, entry]));
  const selected: Array<{ label: string; value: string | number | boolean }> = [];
  const seen = new Set<string>();

  for (const key of preferredKeys) {
    const stat = byKey.get(key);
    if (!stat) continue;
    selected.push(stat);
    seen.add(key);
    if (selected.length >= limit) return selected;
  }

  for (const stat of primitives) {
    if (seen.has(stat.label)) continue;
    selected.push(stat);
    if (selected.length >= limit) break;
  }

  return selected;
}
