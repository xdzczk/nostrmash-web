import { asArray, asNumber, asRecord, asString, compactDefined } from "./helpers";
import type {
  DiscoveryConfidence,
  DiscoveryItemRanking,
  DiscoveryListMeta,
  DiscoveryRankingReason,
  DiscoveryReasonEvidence,
} from "@/lib/types/api";
import { DISCOVERY_RANKING_ENABLED } from "@/lib/ui/version";

function normalizeConfidence(value: unknown): DiscoveryConfidence | undefined {
  return value === "low" || value === "medium" || value === "high" ? value : undefined;
}

function normalizeEvidence(value: unknown): DiscoveryReasonEvidence | null {
  const record = asRecord(value);
  if (!record) return null;
  const metric = asString(record.metric);
  const amount = asNumber(record.value);
  if (!metric || amount === undefined) return null;
  return compactDefined({
    metric,
    value: amount,
    unit: asString(record.unit),
  });
}

function normalizeReason(value: unknown): DiscoveryRankingReason | null {
  const record = asRecord(value);
  if (!record) return null;
  const code = asString(record.code);
  if (!code) return null;
  const evidence = asArray(record.evidence)
    .map(normalizeEvidence)
    .filter((entry): entry is DiscoveryReasonEvidence => entry !== null);
  return compactDefined({
    code,
    evidence: evidence.length > 0 ? evidence : undefined,
  });
}

export function normalizeDiscoveryRanking(value: unknown): DiscoveryItemRanking | undefined {
  if (!DISCOVERY_RANKING_ENABLED) return undefined;
  const record = asRecord(value);
  if (!record) return undefined;
  const rank = asNumber(record.rank);
  const score = asNumber(record.score);
  if (rank === undefined || rank < 1 || score === undefined) return undefined;
  const reasons = asArray(record.reasons)
    .map(normalizeReason)
    .filter((entry): entry is DiscoveryRankingReason => entry !== null);

  return compactDefined({
    rank: Math.trunc(rank),
    score,
    previous_rank: asNumber(record.previous_rank),
    rank_delta: asNumber(record.rank_delta),
    reasons: reasons.length > 0 ? reasons : undefined,
    source_breadth: asNumber(record.source_breadth),
    confidence: normalizeConfidence(record.confidence),
  });
}

export function normalizeDiscoveryListMeta(value: unknown): DiscoveryListMeta | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const meta = compactDefined({
    window: asString(record.window),
    computed_at: asString(record.computed_at),
    ranking_version: asString(record.ranking_version),
    confidence: normalizeConfidence(record.confidence),
  });
  return Object.keys(meta).length > 0 ? meta : undefined;
}
