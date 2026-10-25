import type {
  DiscoveryItemRanking,
  DiscoveryRankingReason,
  DiscoveryReasonEvidence,
} from "@/lib/types/api";

export type DiscoveryReasonPresentation = {
  text: string;
  support?: string;
  code?: string;
};

const REASON_LABELS: Record<string, string> = {
  reply_velocity: "rising replies",
  repost_lift: "repost lift",
  recent_engagement: "recent engagement",
  zap_support: "zap support",
  follower_growth: "follower growth",
  publishing_momentum: "publishing momentum",
  engagement_received: "engagement received",
  engagement_quality: "engagement per post",
  relative_engagement_growth: "engagement vs. audience size",
  mention_volume: "topic lift",
  author_breadth: "breadth of authors",
  link_circulation: "link circulation",
  combined_engagement: "combined engagement",
  recency: "newer in this window",
  conversation_velocity: "conversation velocity",
  participant_breadth: "participant breadth",
};

/**
 * Reasons whose evidence is a count of discrete things (posts, followers,
 * links…). A count of one is noise, not momentum, so these need at least two
 * to be shown; otherwise the reason falls through to the next one.
 */
const COUNT_FLOOR_CODES = new Set([
  "publishing_momentum",
  "follower_growth",
  "mention_volume",
  "link_circulation",
  "author_breadth",
  "participant_breadth",
]);
const COUNT_FLOOR = 2;

/**
 * Ratio reasons ("per follower", "per note") below 1 are noise: 0.1
 * interactions per follower is not a reason to be on the page. 1 and above
 * stay, including values like 6.8 and 10.
 */
const RATE_FLOOR = 1;
const RATE_CODES = new Set(["relative_engagement_growth", "engagement_quality"]);

/** Reasons describing growth, where a leading "+" makes the number read as a delta. */
const GROWTH_CODES = new Set(["follower_growth"]);

/** Units that count whole things and must never render fractionally. */
const COUNT_UNIT_PATTERN =
  /^(followers?|posts?|notes?|repl(y|ies)|reposts?|interactions?|links?|mentions?|authors?|zaps?|reactions?|sources?|relays?|participants?|shares?|appearances?|boosts?|likes?)$/i;

function singularize(unit: string): string {
  if (/ies$/i.test(unit)) return unit.replace(/ies$/i, "y");
  if (/s$/i.test(unit) && !/ss$/i.test(unit)) return unit.slice(0, -1);
  return unit;
}

/**
 * Round evidence for display: whole units are rounded to integers (3.75
 * followers → 4 followers); ratios keep one decimal below 10 (8.214 → 8.2,
 * 0.403 → 0.4) and none above. Three-decimal precision is false precision
 * for a "why now" line.
 */
export function formatEvidenceValue(value: number, unit?: string): string {
  if (!Number.isFinite(value)) return "";
  const isCount = unit ? COUNT_UNIT_PATTERN.test(unit.trim()) : Number.isInteger(value);
  if (isCount) return Math.round(value).toLocaleString();
  if (Math.abs(value) >= 10) return Math.round(value).toLocaleString();
  const rounded = Math.round(value * 10) / 10;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function humanizeCode(code: string): string {
  return code.replace(/[_-]+/g, " ").trim().toLowerCase();
}

function formatEvidence(
  evidence: DiscoveryReasonEvidence | undefined,
  code: string
): string | undefined {
  if (!evidence) return undefined;
  const rendered = formatEvidenceValue(evidence.value, evidence.unit);
  if (!rendered) return undefined;
  const sign = GROWTH_CODES.has(code) && evidence.value > 0 ? "+" : "";
  if (!evidence.unit) return `${sign}${rendered}`;
  const unit =
    COUNT_UNIT_PATTERN.test(evidence.unit.trim()) && Math.round(evidence.value) === 1
      ? singularize(evidence.unit.trim())
      : evidence.unit.trim();
  return `${sign}${rendered} ${unit}`;
}

function isRateEvidence(reason: DiscoveryRankingReason): boolean {
  if (RATE_CODES.has(reason.code)) return true;
  const unit = reason.evidence?.[0]?.unit ?? "";
  return /\bper\b/i.test(unit);
}

function belowFloor(reason: DiscoveryRankingReason): boolean {
  const evidence = reason.evidence?.[0];
  if (!evidence || !Number.isFinite(evidence.value)) return false;
  if (isRateEvidence(reason)) return evidence.value < RATE_FLOOR;
  if (!COUNT_FLOOR_CODES.has(reason.code)) return false;
  return evidence.value < COUNT_FLOOR;
}

/** Sources behind a rank. This is the figure the server order follows. */
export function sourceCount(ranking: DiscoveryItemRanking | undefined): number | null {
  const value = ranking?.source_breadth;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/** Volume (events, links, posts) under 2 is the same floor as count reasons. */
export function belowVolumeFloor(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value < COUNT_FLOOR;
}

/**
 * First positive volume among candidates. All-zero counts stay below the
 * floor; a missing count does not, so a row without a volume figure is kept.
 */
export function listedVolume(values: unknown[]): number | undefined {
  const numbers = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  if (numbers.length === 0) return undefined;
  return numbers.find((value) => value > 0) ?? numbers[0];
}

function presentReason(reason: DiscoveryRankingReason): DiscoveryReasonPresentation | null {
  if (!reason.code || belowFloor(reason)) return null;
  // Unknown codes are still the server's actual ranking rationale; a humanized
  // code beats falling back to inferred stats that may contradict the rank.
  const text = REASON_LABELS[reason.code] ?? humanizeCode(reason.code);
  if (!text) return null;
  return {
    text,
    support: formatEvidence(reason.evidence?.[0], reason.code),
    code: reason.code,
  };
}

/**
 * Topic and link rows already print unique authors as the source figure.
 * That count is the sort key, so the why-now line must not repeat it or
 * fall through to volume, which is not the order.
 */
export function reasonsBesideSourceFigure<T extends { code?: string }>(
  ranking: DiscoveryItemRanking | undefined,
  reasons: T[]
): T[] {
  if (ranking?.reasons?.some((reason) => reason.code === "author_breadth")) return [];
  if (sourceCount(ranking) != null && reasons.some((reason) => reason.code === "author_breadth")) {
    return [];
  }
  return reasons;
}

export function mapServerRankingReasons(
  ranking: DiscoveryItemRanking | undefined
): DiscoveryReasonPresentation[] {
  if (!ranking?.reasons?.length) return [];
  return ranking.reasons
    .map(presentReason)
    .filter((entry): entry is DiscoveryReasonPresentation => entry !== null);
}

export function discoveryReasonSource(
  ranking: DiscoveryItemRanking | undefined
): "server" | "inferred" {
  return ranking?.reasons?.length ? "server" : "inferred";
}

export type RankMovement = { direction: "up" | "down"; places: number };

/**
 * Rank movement versus the previous computation. `previous_rank` is
 * unambiguous (places moved = previous − current); `rank_delta` is used as a
 * fallback with the same sign convention (positive = moved up).
 */
export function rankMovement(ranking: DiscoveryItemRanking | undefined): RankMovement | null {
  if (!ranking) return null;
  if (typeof ranking.previous_rank === "number" && Number.isFinite(ranking.previous_rank)) {
    const delta = ranking.previous_rank - ranking.rank;
    if (delta === 0) return null;
    return { direction: delta > 0 ? "up" : "down", places: Math.abs(delta) };
  }
  if (typeof ranking.rank_delta === "number" && Number.isFinite(ranking.rank_delta)) {
    if (ranking.rank_delta === 0) return null;
    return {
      direction: ranking.rank_delta > 0 ? "up" : "down",
      places: Math.abs(ranking.rank_delta),
    };
  }
  return null;
}
