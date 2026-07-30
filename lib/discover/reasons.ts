import type {
  DiscoveryItemRanking,
  DiscoveryRankingReason,
  DiscoveryReasonEvidence,
} from "@/lib/types/api";

export type DiscoveryReasonPresentation = {
  text: string;
  support?: string;
};

const REASON_LABELS: Record<string, string> = {
  reply_velocity: "rising replies",
  repost_lift: "repost lift",
  recent_engagement: "recent engagement",
  zap_support: "zap support",
  follower_growth: "follower growth",
  publishing_momentum: "publishing momentum",
  engagement_received: "engagement received",
  mention_volume: "topic lift",
  author_breadth: "breadth of authors",
  link_circulation: "link circulation",
  conversation_velocity: "conversation velocity",
  participant_breadth: "participant breadth",
};

function formatEvidence(evidence: DiscoveryReasonEvidence | undefined): string | undefined {
  if (!evidence) return undefined;
  const value = evidence.value.toLocaleString();
  return evidence.unit ? `${value} ${evidence.unit}` : value;
}

function presentReason(reason: DiscoveryRankingReason): DiscoveryReasonPresentation | null {
  const text = REASON_LABELS[reason.code];
  if (!text) return null;
  return {
    text,
    support: formatEvidence(reason.evidence?.[0]),
  };
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
