import type { SeriesPoint } from "@/components/charts/sparkline";

/** Change in a rolling total from one sample to the next. The first sample has no delta. */
export function rollingTotalDeltas(points: SeriesPoint[]): SeriesPoint[] {
  const deltas: SeriesPoint[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    if (!current || !previous) continue;
    deltas.push({ t: current.t, v: current.v - previous.v });
  }
  return deltas;
}
