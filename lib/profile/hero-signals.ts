import { parseTimestamp } from "@/lib/time/freshness";
import type { TrustSummary } from "@/lib/types/api";

/**
 * NIP-05 root identifiers are written `_@domain`; the convention is to display
 * them as the bare domain. Everything else is returned unchanged.
 */
export function formatNip05(nip05: string | null | undefined): string | null {
  if (typeof nip05 !== "string") return null;
  const trimmed = nip05.trim();
  if (trimmed.length === 0) return null;
  const rootMatch = /^_@(.+)$/.exec(trimmed);
  return rootMatch?.[1] ?? trimmed;
}

export type TrustTierLabel = {
  /** Human tier name, e.g. "Seed" */
  tier: string;
  /** Short percentile phrase, e.g. "top 0.1%", or null when unknown. */
  percentile: string | null;
  /** Single-line label for pills: "Seed · top 0.1%" */
  label: string;
};

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * `percentile` is a 0..1 fraction where lower means more trusted. We round to
 * a readable "top N%" phrase with at most one decimal and never claim "top 0%".
 */
export function formatTrustPercentile(percentile: number | undefined): string | null {
  if (typeof percentile !== "number" || !Number.isFinite(percentile)) return null;
  if (percentile < 0 || percentile > 1) return null;
  const percent = percentile * 100;
  if (percent < 0.1) return "top 0.1%";
  if (percent < 1) return `top ${percent.toFixed(1)}%`;
  if (percent < 10) return `top ${Math.round(percent)}%`;
  return `top ${Math.round(percent / 5) * 5}%`;
}

export function formatTrustTier(trust: TrustSummary | null | undefined): TrustTierLabel | null {
  if (!trust) return null;
  const tierRaw = typeof trust.tier === "string" ? trust.tier.trim() : "";
  if (tierRaw.length === 0) return null;
  const tier = titleCase(tierRaw);
  const percentile = formatTrustPercentile(trust.percentile);
  return {
    tier,
    percentile,
    label: percentile ? `${tier} · ${percentile}` : tier,
  };
}

/** Relative "Last active 9h ago" label; null when no usable timestamp. */
export function lastActiveLabel(value: unknown, nowMs: number): string | null {
  const date = parseTimestamp(value);
  if (!date) return null;
  const deltaMs = Math.max(0, nowMs - date.getTime());
  if (deltaMs < 60_000) return "Active just now";
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Active ${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 60) return `Active ${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 24) return `Active ${months}mo ago`;
  return `Active ${Math.round(months / 12)}y ago`;
}

/**
 * Unix seconds (or ms, or ISO string) to a stable, locale-independent date.
 * The summary's identity details send the timestamp as a digit string, which
 * `Date.parse` would misread, so numeric strings are coerced first.
 */
export function formatUnixDate(value: unknown): string | null {
  const coerced =
    typeof value === "string" && /^\d{9,13}$/.test(value.trim()) ? Number(value.trim()) : value;
  const date = parseTimestamp(coerced);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}
