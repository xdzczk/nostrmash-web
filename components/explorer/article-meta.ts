import type { EventRecord } from "@/lib/types/api";

export interface ArticlePresentation {
  title: string;
  summary?: string;
  image?: string;
  language?: string;
  publishedAt?: number;
  hashtags: string[];
  readingMinutes?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function tagValue(note: EventRecord, name: string): string | undefined {
  if (!Array.isArray(note.tags)) return undefined;
  for (const tag of note.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    if (String(tag[0]).toLowerCase() !== name.toLowerCase()) continue;
    const candidate = asString(tag[1]);
    if (candidate) return candidate;
  }
  return undefined;
}

function extractHashtags(note: EventRecord, limit = 4): string[] {
  if (!Array.isArray(note.tags)) return [];
  const hashtags: string[] = [];
  for (const tag of note.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    if (String(tag[0]).toLowerCase() !== "t") continue;
    const normalized = asString(tag[1])?.replace(/^#/, "").toLowerCase();
    if (normalized && normalized.length > 0) hashtags.push(normalized);
  }
  return Array.from(new Set(hashtags)).slice(0, limit);
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~>#-]{1,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadingMinutes(content: string): number | undefined {
  const words = content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  if (words === 0) return undefined;
  return Math.max(1, Math.round(words / 220));
}

export function getArticlePresentation(note: EventRecord): ArticlePresentation {
  const record = note as Record<string, unknown>;
  const author = asRecord(record.author);
  const content = typeof note.content === "string" ? note.content : "";
  const strippedContent = stripMarkdown(content);

  const title =
    asString(record.title) ??
    tagValue(note, "title") ??
    (strippedContent.length > 0 ? strippedContent.slice(0, 90) : undefined) ??
    "Untitled article";

  const summaryRaw =
    asString(record.summary) ??
    asString(record.description) ??
    tagValue(note, "summary") ??
    (strippedContent.length > 0 ? strippedContent : undefined);
  const summary =
    summaryRaw && summaryRaw.length > 0
      ? summaryRaw.length > 280
        ? `${summaryRaw.slice(0, 279).trimEnd()}…`
        : summaryRaw
      : undefined;

  return {
    title,
    summary,
    image: asString(record.image) ?? tagValue(note, "image"),
    language: asString(record.language) ?? tagValue(note, "language") ?? asString(author?.language),
    publishedAt:
      asNumber(record.published_at) ?? asNumber(tagValue(note, "published_at")) ?? note.created_at,
    hashtags: extractHashtags(note),
    readingMinutes: estimateReadingMinutes(content),
  };
}
