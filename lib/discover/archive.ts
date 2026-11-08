import { readEntityBaseline } from "@/lib/discover/baseline";
import type { EntityBaseline } from "@/lib/types/api";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type ArchiveEntry = {
  label: string;
  uniqueAuthors: number;
  baseline: EntityBaseline | null;
};

export type ArchiveDay = {
  date: string;
  hashtags: ArchiveEntry[];
  domains: ArchiveEntry[];
  noteVolume: number | null;
  activeAuthors: number | null;
  noteVolumeBaseline: EntityBaseline | null;
  activeAuthorsBaseline: EntityBaseline | null;
};

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function entries(value: unknown, labelKey: "hashtag" | "domain"): ArchiveEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const label = typeof row[labelKey] === "string" ? row[labelKey].trim() : "";
    const authors = count(row.unique_authors);
    if (!label || authors === null) return [];
    return [{ label, uniqueAuthors: authors, baseline: readEntityBaseline(row.baseline) }];
  });
}

export function readArchiveDay(value: unknown): ArchiveDay | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const date = typeof row.day === "string" && DAY.test(row.day) ? row.day : "";
  if (!date) return null;
  const network =
    row.network && typeof row.network === "object" ? (row.network as Record<string, unknown>) : {};
  return {
    date,
    hashtags: entries(row.hashtags, "hashtag"),
    domains: entries(row.domains, "domain"),
    noteVolume: count(network.note_volume),
    activeAuthors: count(network.active_authors),
    noteVolumeBaseline: readEntityBaseline(network.note_volume_baseline),
    activeAuthorsBaseline: readEntityBaseline(network.active_authors_baseline),
  };
}

export function latestArchiveDay(days: readonly string[], today = utcToday()): string | null {
  const eligible = days.filter((day) => DAY.test(day) && day <= today).sort();
  return eligible.at(-1) ?? null;
}

export function archiveNeighbors(
  days: readonly string[],
  date: string,
  today = utcToday()
): { previous: string | null; next: string | null } {
  const ordered = [...new Set(days.filter((day) => DAY.test(day) && day <= today))].sort();
  const index = ordered.indexOf(date);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: ordered[index - 1] ?? null,
    next: ordered[index + 1] ?? null,
  };
}

export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
