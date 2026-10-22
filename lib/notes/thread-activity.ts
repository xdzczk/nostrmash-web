export type ThreadActivityStats = {
  replies24h?: number;
  replies7d?: number;
  participantCount?: number;
};

/** One line beside the replies heading. Omits any figure the payload left out. */
export function formatThreadActivityLine(stats: ThreadActivityStats): string | null {
  const parts: string[] = [];
  if (typeof stats.replies24h === "number" && stats.replies24h > 0) {
    parts.push(`${stats.replies24h.toLocaleString()} in the last day`);
  }
  if (typeof stats.participantCount === "number" && stats.participantCount > 0) {
    const noun = stats.participantCount === 1 ? "person" : "people";
    parts.push(`${stats.participantCount.toLocaleString()} ${noun}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
