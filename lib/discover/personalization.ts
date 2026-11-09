import { asBoolean, asNumber, asRecord, asString } from "@/lib/api/normalize/helpers";
import type { Personalization } from "@/lib/types/api";

function cohortCount(value: number): string {
  const rounded = Math.max(0, Math.round(value));
  return `${rounded.toLocaleString()} ${rounded === 1 ? "account" : "accounts"}`;
}

/**
 * One sentence for a ranking response. A failed follow lookup degrades
 * `viewer_cohort` and has no personalization object; that is not the global
 * fallback, and it must not be described as personalized.
 */
export function personalizationNotice(
  personalization: Personalization | undefined,
  options?: { degraded?: boolean; scope?: "list" | "home" }
): string | null {
  if (options?.degraded || !personalization) return null;
  if (personalization.source === "global_fallback") {
    return "This key follows nobody indexed here, so this list is the global one.";
  }
  if (personalization.source !== "personalized") return null;
  const count = cohortCount(personalization.follow_count);
  const lead =
    options?.scope === "home"
      ? `Notes, people, and links are ranked from the ${count} this key follows.`
      : `Ranked from the ${count} this key follows.`;
  if (personalization.follows_truncated) {
    return `${lead} Only the most trusted follows were used.`;
  }
  return lead;
}

export function readPersonalization(value: unknown): Personalization | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const nested =
    record.source === "personalized" || record.source === "global_fallback"
      ? record
      : asRecord(record.personalization);
  if (!nested) return undefined;
  const source = nested.source;
  if (source !== "personalized" && source !== "global_fallback") return undefined;
  const viewer = asString(nested.viewer);
  if (!viewer) return undefined;
  const followCount = asNumber(nested.follow_count);
  const weight = asNumber(nested.cohort_weight);
  return {
    viewer,
    source,
    follow_count: followCount ?? 0,
    follows_truncated: asBoolean(nested.follows_truncated) === true,
    cohort_weight: weight ?? 0,
  };
}

/** Home follow-list failure. The rows are global and must not be claimed as personalized. */
export function viewerCohortDegraded(value: unknown): boolean {
  const record = asRecord(value);
  const reasons = record?.degraded_reasons;
  return Array.isArray(reasons) && reasons.includes("viewer_cohort");
}
