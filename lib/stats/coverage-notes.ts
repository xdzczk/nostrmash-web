export type CoverageNote = { date: string; label: string };

function dayKey(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Date(ms).toISOString().slice(0, 10);
}

function changeLabel(row: Record<string, unknown>): string | null {
  if (typeof row.label === "string" && row.label.trim().length > 0) return row.label.trim();
  const host = typeof row.host === "string" ? row.host.trim() : "";
  if (!host) return null;
  if (row.change === "added") return `Added ${host}`;
  if (row.change === "dropped") return `Dropped ${host}`;
  return null;
}

/** Notes from `GET /api/v1/relays/coverage-changes`. An empty list is a normal answer. */
export function coverageNotesFromChanges(value: unknown): CoverageNote[] {
  const items =
    value && typeof value === "object" && "items" in value
      ? (value as { items?: unknown }).items
      : value;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const occurred = typeof row.occurred_at === "string" ? Date.parse(row.occurred_at) : Number.NaN;
    const label = changeLabel(row);
    if (!Number.isFinite(occurred) || !label) return [];
    return [{ date: new Date(occurred).toISOString().slice(0, 10), label }];
  });
}

export function coverageChangeLabel(
  timestamp: number,
  notes: readonly CoverageNote[] = []
): string {
  const day = dayKey(timestamp);
  const matches = notes.filter((entry) => entry.date === day);
  if (matches.length === 0) return `Index coverage changed on ${day}`;
  return matches.map((entry) => entry.label).join(" · ");
}
