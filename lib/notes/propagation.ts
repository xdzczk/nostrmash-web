import { OFFLINE_RELAYS } from "@/lib/relays/coverage";

export function observationTime(value: string | number | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric > 1e12 ? numeric : numeric * 1000;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatSeenDelta(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return "same moment";
  if (minutes < 60) return `+${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `+${hours}h`;
  return `+${Math.round(hours / 24)}d`;
}

export function isOfflineRelayHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/\.$/, "");
  return OFFLINE_RELAYS.some((relay) => relay.host === normalized);
}

/**
 * One line of arrival order. Relays without a timestamp are left out rather
 * than given an invented delay.
 */
export function propagationLine(
  rows: Array<{ host: string; seenAt?: string | number }>
): string | null {
  const timed = rows.flatMap((row) => {
    const host = row.host.trim();
    const seen = observationTime(row.seenAt);
    if (!host || seen === null) return [];
    return [{ host, seen }];
  });
  if (timed.length === 0) return null;
  timed.sort((left, right) => left.seen - right.seen);
  const first = timed[0]?.seen;
  if (first === undefined) return null;
  return timed
    .map((row) =>
      row.seen === first
        ? `First on ${row.host}`
        : `${row.host} ${formatSeenDelta(row.seen - first)}`
    )
    .join(" · ");
}
