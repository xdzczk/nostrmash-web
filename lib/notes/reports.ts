import { eventTagRows } from "@/lib/notes/event-tags";
import { REPORT_KIND } from "@/lib/notes/kinds";

export const REPORT_TYPES = [
  "nudity",
  "malware",
  "profanity",
  "illegal",
  "spam",
  "impersonation",
  "other",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportRecord = {
  id?: string;
  reporter_pubkey?: string;
  report_type: ReportType;
  content?: string;
  created_at?: number;
};

const HEX_64 = /^[0-9a-f]{64}$/i;

export function canonicalReportType(value: string | undefined): ReportType {
  const normalized = value?.trim().toLowerCase() ?? "";
  return (REPORT_TYPES as readonly string[]).includes(normalized)
    ? (normalized as ReportType)
    : "other";
}

export function reportTypeLabel(type: string | undefined): string {
  switch (canonicalReportType(type)) {
    case "nudity":
      return "Nudity";
    case "malware":
      return "Malware";
    case "profanity":
      return "Profanity";
    case "illegal":
      return "Illegal";
    case "spam":
      return "Spam";
    case "impersonation":
      return "Impersonation";
    default:
      return "Other";
  }
}

/**
 * NIP-56 stores the report type as the last element of the `e` or `p` tag.
 * Relay URLs and the target id itself are not types.
 */
export function reportTypeFromTags(tags: unknown): ReportType {
  for (const tag of eventTagRows(tags)) {
    const name = (tag[0] ?? "").toLowerCase();
    if (name !== "e" && name !== "p") continue;
    for (let index = tag.length - 1; index >= 2; index -= 1) {
      const value = tag[index]?.trim() ?? "";
      if (!value || HEX_64.test(value)) continue;
      if (/^(wss?|https?):\/\//i.test(value)) continue;
      return canonicalReportType(value);
    }
  }
  return "other";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function normalizeReportRecord(value: unknown): ReportRecord | null {
  const record = asRecord(value);
  if (!record) return null;

  const reporter = asString(record.reporter_pubkey) ?? asString(record.pubkey);
  const explicitType = asString(record.report_type);
  const content = asString(record.content);
  const createdAt = typeof record.created_at === "number" ? record.created_at : undefined;
  const id = asString(record.report_event_id) ?? asString(record.id);

  if (explicitType || asString(record.reporter_pubkey) || asString(record.report_event_id)) {
    return {
      id,
      reporter_pubkey: reporter,
      report_type: canonicalReportType(explicitType),
      content,
      created_at: createdAt,
    };
  }

  const kind = typeof record.kind === "number" ? record.kind : undefined;
  if (kind !== undefined && kind !== REPORT_KIND) return null;
  if (!id && !reporter && !content) return null;
  return {
    id,
    reporter_pubkey: reporter,
    report_type: reportTypeFromTags(record.tags),
    content,
    created_at: createdAt,
  };
}

export function normalizeReportRecords(value: unknown): ReportRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeReportRecord(entry))
    .filter((entry): entry is ReportRecord => entry !== null);
}
