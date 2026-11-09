import { formatStatsWindowSpan, type StatsWindow } from "@/lib/search-params/window";

const COUNT_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
] as const;

/** Headline for the network overview. The share is the argument. */
export function concentrationTitle(
  relayCount: number,
  sharePercent: number,
  window: StatsWindow
): string {
  if (relayCount <= 0 || sharePercent <= 0) return "The network behind the conversation.";
  const count = Math.round(relayCount);
  const subject =
    count <= 10 ? `${COUNT_WORDS[count]} ${count === 1 ? "relay" : "relays"}` : `${count} relays`;
  const when = formatStatsWindowSpan(window);
  return `${subject} carried ${Math.round(sharePercent)}% of what we indexed ${when}.`;
}

/**
 * Homepage lede for relay concentration. A mild share is not the story.
 * Scores are already ordered with the largest first.
 */
export function strikingConcentration(scores: number[], window: StatsWindow): string | null {
  const positive = scores.filter((score) => Number.isFinite(score) && score > 0);
  if (positive.length < 2) return null;
  const total = positive.reduce((sum, score) => sum + score, 0);
  if (total <= 0) return null;
  const headCount = Math.min(3, positive.length);
  const head = positive.slice(0, headCount).reduce((sum, score) => sum + score, 0);
  const share = Math.round((head / total) * 100);
  if (share < 50) return null;
  return concentrationTitle(headCount, share, window);
}
