import type { SeriesPoint } from "@/components/charts/sparkline";

/** A level that moves this many times between samples is annotated, not drawn as a smooth trend. */
export const SERIES_JUMP_FACTOR = 2.5;

export function seriesJumped(previous: number, current: number): boolean {
  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous <= 0 || current <= 0) {
    return false;
  }
  const ratio = current > previous ? current / previous : previous / current;
  return ratio >= SERIES_JUMP_FACTOR;
}

/** Indexes of `points` whose value jumped from the previous sample. */
export function seriesJumpIndexes(points: SeriesPoint[]): number[] {
  const indexes: number[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    if (current && previous && seriesJumped(previous.v, current.v)) indexes.push(index);
  }
  return indexes;
}
