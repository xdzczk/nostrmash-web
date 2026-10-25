import type { StatsWindow } from "@/lib/search-params/window";

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
  const when = window === "7d" ? "in the last 7 days" : "in the last day";
  return `${subject} carried ${Math.round(sharePercent)}% of what we indexed ${when}.`;
}
