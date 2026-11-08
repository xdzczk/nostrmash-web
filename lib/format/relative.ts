/**
 * Compare a value with its usual level. `baseline` is the typical value
 * (a median or average), not a previous sample.
 */
export function vsBaseline(value: number, baseline: number, basis = "usual"): string | null {
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(baseline) || baseline <= 0) {
    return null;
  }
  const ratio = value / baseline;
  if (ratio >= 1.8) {
    const digits = ratio >= 10 ? 0 : 1;
    const rendered = (Math.round(ratio * 10 ** digits) / 10 ** digits).toLocaleString(undefined, {
      maximumFractionDigits: digits,
    });
    return `${rendered}x ${basis}`;
  }
  if (ratio >= 1.15) {
    return `+${Math.round((ratio - 1) * 100)}% vs ${basis}`;
  }
  if (ratio <= 0.85) {
    return `${Math.round((1 - ratio) * 100)}% below ${basis}`;
  }
  return `about the same as ${basis}`;
}
