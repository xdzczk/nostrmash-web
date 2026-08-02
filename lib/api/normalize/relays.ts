import type { RelayHealthResponse } from "@/lib/types/api";
import {
  asArray,
  asBoolean,
  asNumber,
  asRecord,
  asString,
  compactDefined,
} from "@/lib/api/normalize/helpers";

export function normalizeRelayObservation(
  value: unknown
): { relay_url?: string; seen_at?: string | number; [key: string]: unknown } | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return { relay_url: value.trim() };
  }

  const record = asRecord(value);
  if (!record) return null;

  const relayUrl =
    asString(record.relay_url) ??
    asString(record.url) ??
    asString(record.relay) ??
    asString(record.host) ??
    asString(record.name);
  const seenAt =
    asString(record.seen_at) ??
    asNumber(record.seen_at) ??
    asString(record.last_seen_at) ??
    asNumber(record.last_seen_at) ??
    asString(record.latest_checkpoint_at) ??
    asNumber(record.latest_checkpoint_at) ??
    asString(record.first_seen_at) ??
    asNumber(record.first_seen_at);

  return compactDefined({
    ...record,
    relay_url: relayUrl,
    seen_at: seenAt,
  });
}

export function relayHealthyFromObservation(entry: Record<string, unknown>): boolean | undefined {
  const healthy = asBoolean(entry.healthy);
  if (typeof healthy === "boolean") return healthy;
  const status = asString(entry.status)?.trim().toLowerCase();
  if (!status) return undefined;
  // Keep in sync with parseRelayHealthyFlag in components/explorer/stats-utils.ts.
  if (["healthy", "ok", "up", "online", "active"].includes(status)) return true;
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
    ].includes(status)
  ) {
    return false;
  }
  return undefined;
}

export function normalizeRelayHealthResponse(value: unknown): RelayHealthResponse {
  const record = asRecord(value) ?? {};
  const candidateRelays =
    record.relays ?? record.relay_health ?? record.health ?? record.items ?? record.data;
  const relays = asArray(candidateRelays)
    .map((entry) => normalizeRelayObservation(entry))
    .filter(
      (entry): entry is { relay_url?: string; seen_at?: string | number; [key: string]: unknown } =>
        entry !== null
    )
    .map((entry) => {
      const latestCheckpointAt =
        asString(entry.latest_checkpoint_at) ?? asNumber(entry.latest_checkpoint_at);
      const lastSeenAt =
        asString(entry.last_seen_at) ??
        asNumber(entry.last_seen_at) ??
        asString(entry.seen_at) ??
        asNumber(entry.seen_at) ??
        latestCheckpointAt;

      return compactDefined({
        ...entry,
        status: asString(entry.status),
        healthy: relayHealthyFromObservation(entry),
        mode: asString(entry.mode),
        filter_group: asString(entry.filter_group),
        last_error: asString(entry.last_error),
        latest_checkpoint_at: latestCheckpointAt,
        eose_seen_at: asString(entry.eose_seen_at) ?? asNumber(entry.eose_seen_at),
        last_seen_at: lastSeenAt,
      });
    });

  return {
    ...record,
    relays: relays.length > 0 ? relays : undefined,
  };
}
