import { getRequestNowMs } from "@/lib/time/request-now";

/** Match IndexedAt: fresh when younger than 30 minutes. */
export const STALE_AFTER_MS = 30 * 60 * 1000;

export function parseTimestamp(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * (value < 1e12 ? 1000 : 1));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }
  return null;
}

function formatAge(date: Date, nowMs: number): string {
  const deltaMs = Math.max(0, nowMs - date.getTime());
  if (deltaMs < 60_000) return "just now";
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** Relative freshness label like "Updated 3d ago", or null when no timestamp. */
export function formatUpdatedRelative(
  value: unknown,
  nowMs: number = getRequestNowMs()
): string | null {
  const date = parseTimestamp(value);
  if (!date) return null;
  return `Updated ${formatAge(date, nowMs)}`;
}

export function isFreshTimestamp(
  value: unknown,
  nowMs: number = getRequestNowMs(),
  staleAfterMs: number = STALE_AFTER_MS
): boolean {
  const date = parseTimestamp(value);
  if (!date) return false;
  return nowMs - date.getTime() <= staleAfterMs;
}
