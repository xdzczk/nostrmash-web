import { vsBaseline } from "@/lib/format/relative";
import type { EntityBaseline } from "@/lib/types/api";

export function readEntityBaseline(value: unknown): EntityBaseline | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const metric = typeof row.metric === "string" ? row.metric : "";
  const window = typeof row.window === "string" ? row.window : "";
  const typical = typeof row.typical === "number" ? row.typical : Number.NaN;
  const current = typeof row.value === "number" ? row.value : Number.NaN;
  const basis = typeof row.typical_basis === "string" ? row.typical_basis : "";
  if (!metric || !Number.isFinite(typical) || typical <= 0) return null;
  if (!Number.isFinite(current) || current < 0) return null;
  return {
    metric,
    window,
    value: current,
    typical,
    typical_basis: basis,
    ratio: current / typical,
  };
}

export function baselineBasisPhrase(basis: string | undefined): string {
  if (basis === "same_weekday_median") return "a typical same weekday";
  if (basis === "entity_30d_median") return "its usual day";
  return "usual";
}

export function baselineComparison(baseline: EntityBaseline | null | undefined): string | null {
  if (!baseline || typeof baseline.value !== "number" || typeof baseline.typical !== "number") {
    return null;
  }
  return vsBaseline(baseline.value, baseline.typical, baselineBasisPhrase(baseline.typical_basis));
}

/** Comparison for a unique-author count. Skipped when the stored value is a different count. */
export function authorBaselineComparison(
  baseline: unknown,
  authors: number | undefined
): string | null {
  const parsed = readEntityBaseline(baseline);
  if (!parsed || parsed.metric !== "unique_authors") return null;
  if (typeof authors !== "number" || parsed.value !== authors) return null;
  return baselineComparison(parsed);
}
