/**
 * Dated notes for index-coverage changes. Empty until
 * `/api/v1/relays/coverage-changes` exists; a jump with no note still says
 * the coverage changed rather than pretending the network did.
 */
export const COVERAGE_NOTES: ReadonlyArray<{ date: string; label: string }> = [];

function dayKey(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Date(ms).toISOString().slice(0, 10);
}

export function coverageChangeLabel(timestamp: number): string {
  const day = dayKey(timestamp);
  const note = COVERAGE_NOTES.find((entry) => entry.date === day);
  if (note) return note.label;
  return `Index coverage changed on ${day}`;
}
