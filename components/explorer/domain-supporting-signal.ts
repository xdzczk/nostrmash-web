import type { DomainEntry } from "@/lib/types/api";

export type DomainSupportingSignal = {
  key: "unique_authors" | "event_count" | "count";
  label: "Authors" | "Linked notes" | "Appearances";
  value: number;
  valueLabel: string;
  reliabilityRank: number;
};

type CandidateSignal = Omit<DomainSupportingSignal, "valueLabel">;

function formatCount(value: number, singular: string, plural: string): string {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function toCandidates(entry: DomainEntry): CandidateSignal[] {
  const candidates: CandidateSignal[] = [];

  if (isPositiveNumber(entry.unique_authors)) {
    candidates.push({
      key: "unique_authors",
      label: "Authors",
      value: entry.unique_authors,
      reliabilityRank: 3,
    });
  }

  if (isPositiveNumber(entry.event_count)) {
    candidates.push({
      key: "event_count",
      label: "Linked notes",
      value: entry.event_count,
      reliabilityRank: 2,
    });
  }

  if (isPositiveNumber(entry.count)) {
    candidates.push({
      key: "count",
      label: "Appearances",
      value: entry.count,
      reliabilityRank: 1,
    });
  }

  return candidates;
}

export function pickPrimaryDomainSupportingSignal(
  entry: DomainEntry
): DomainSupportingSignal | null {
  const strongest = toCandidates(entry).sort((left, right) => {
    if (right.value !== left.value) return right.value - left.value;
    return right.reliabilityRank - left.reliabilityRank;
  })[0];
  if (!strongest) return null;

  const valueLabel =
    strongest.key === "unique_authors"
      ? formatCount(strongest.value, "author", "authors")
      : strongest.key === "event_count"
        ? formatCount(strongest.value, "note", "notes")
        : formatCount(strongest.value, "appearance", "appearances");

  return {
    ...strongest,
    valueLabel,
  };
}
