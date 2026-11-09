import { LONG_FORM_KIND, type EventRecord } from "@/lib/types/api";

export interface ArticlePresentation {
  title: string;
  summary?: string;
  /** Author-supplied dek (not derived from the body). */
  dek?: string;
  body: string;
  image?: string;
  language?: string;
  publishedAt?: number;
  hashtags: string[];
  readingMinutes?: number;
  /** Author-supplied subject, shown when it is not the same text as the title. */
  subject?: string;
}

export function isLongFormEvent(note: EventRecord | null | undefined): boolean {
  return typeof note?.kind === "number" && note.kind === LONG_FORM_KIND;
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

function extractHashtags(note: EventRecord, limit?: number): string[] {
  if (!Array.isArray(note.tags)) return [];
  const hashtags: string[] = [];
  for (const tag of note.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    if (String(tag[0]).toLowerCase() !== "t") continue;
    const normalized = asString(tag[1])?.replace(/^#/, "").toLowerCase();
    if (normalized && normalized.length > 0) hashtags.push(normalized);
  }
  const unique = Array.from(new Set(hashtags));
  return typeof limit === "number" ? unique.slice(0, limit) : unique;
}

function isPipeTableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  if (trimmed.startsWith("|") || trimmed.endsWith("|")) return true;
  const cells = trimmed
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (entity, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    })
    .replace(/&#(\d+);/g, (entity, num: string) => {
      const code = Number.parseInt(num, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function stripMarkdown(value: string): string {
  const decoded = decodeEntities(value);
  const withoutTables = decoded
    .split("\n")
    .filter((line) => !isPipeTableLine(line))
    .join("\n");
  return withoutTables
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-+*]\s+/gm, "")
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, " ")
    .replace(/[*_~>#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A summary that is only punctuation, pipes, or symbols is not a summary. */
function hasReadableText(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

/** A stored title that is really the opening of the body. */
function usableFieldTitle(value: string | undefined, body: string): string | undefined {
  if (!value) return undefined;
  const title = value.replace(/\s+/g, " ").trim();
  if (!title || title.length > 180) return undefined;
  const text = body.replace(/\s+/g, " ").trim().toLowerCase();
  if (title.length >= 80 && text.startsWith(title.toLowerCase().slice(0, 80))) return undefined;
  return title;
}

/** First https image in the prose. Fenced code is not a cover. */
function firstContentImage(content: string): string | undefined {
  const prose = content.replace(/```[\s\S]*?```/g, " ");
  const markdown = /!\[[^\]]*]\((https:\/\/[^)\s]+)\)/.exec(prose);
  if (markdown?.[1]) return markdown[1];
  const html = /<img\b[^>]*\bsrc=["'](https:\/\/[^"']+)["']/i.exec(prose);
  return html?.[1];
}

/** Cover URL safe to put in an image element. */
export function articleCoverSrc(note: EventRecord): string | undefined {
  const image = getArticlePresentation(note).image;
  if (!image) return undefined;
  try {
    const url = new URL(image);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** First short markdown heading. A paragraph is not a title. */
function firstMarkdownHeading(content: string): string | undefined {
  for (const line of content.split("\n")) {
    const match = /^#{1,2}\s+(\S.*)$/.exec(line.trim());
    if (!match?.[1]) continue;
    const heading = stripMarkdown(match[1]);
    if (heading.length > 0 && heading.length <= 160 && hasReadableText(heading)) return heading;
  }
  return undefined;
}

/** Drop a summary that only repeats the title. */
function summaryAfterTitle(title: string, summary: string): string | undefined {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const normalizedSummary = normalize(summary);
  const normalizedTitle = normalize(title);
  if (!normalizedSummary || normalizedSummary === normalizedTitle) return undefined;
  if (normalizedSummary.startsWith(normalizedTitle)) {
    const rest = summary
      .slice(title.length)
      .replace(/^[\s—–\-:.,]+/, "")
      .trim();
    return rest.length > 24 ? rest : undefined;
  }
  return summary;
}

function estimateReadingMinutes(content: string): number | undefined {
  const words = content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  if (words === 0) return undefined;
  return Math.max(1, Math.round(words / 220));
}

export function getArticlePresentation(
  note: EventRecord,
  options?: { summaryMaxLength?: number; hashtagLimit?: number }
): ArticlePresentation {
  const summaryMaxLength = options?.summaryMaxLength ?? 280;
  const record = note as Record<string, unknown>;
  const author = asRecord(record.author);
  const content = typeof note.content === "string" ? note.content : "";
  const strippedContent = stripMarkdown(content);

  const tagTitle = tagValue(note, "title");
  const fieldTitle = usableFieldTitle(asString(record.title), strippedContent);
  const explicitTitleRaw = tagTitle ?? fieldTitle;
  const explicitTitle = explicitTitleRaw ? stripMarkdown(explicitTitleRaw) : undefined;
  const headingTitle = explicitTitle ? undefined : firstMarkdownHeading(content);
  const title = explicitTitle ?? headingTitle ?? "Untitled article";

  const explicitSummary =
    asString(record.summary) ?? asString(record.description) ?? tagValue(note, "summary");
  const explicitStripped = explicitSummary ? stripMarkdown(explicitSummary) : undefined;
  const summarySource =
    explicitStripped && hasReadableText(explicitStripped)
      ? explicitStripped
      : strippedContent.length > 0 && hasReadableText(strippedContent)
        ? strippedContent
        : undefined;
  const clampSummary = (value: string) =>
    value.length > summaryMaxLength ? `${value.slice(0, summaryMaxLength - 1).trimEnd()}…` : value;
  const withoutTitle = summarySource ? summaryAfterTitle(title, summarySource) : undefined;
  const summary =
    withoutTitle && hasReadableText(withoutTitle) ? clampSummary(withoutTitle) : undefined;
  const dek =
    explicitStripped && hasReadableText(explicitStripped)
      ? clampSummary(explicitStripped)
      : undefined;

  return {
    title,
    summary,
    dek,
    body: content,
    image:
      asString(record.image) ??
      tagValue(note, "image") ??
      tagValue(note, "thumb") ??
      firstContentImage(content),
    language: asString(record.language) ?? tagValue(note, "language") ?? asString(author?.language),
    publishedAt:
      asNumber(record.published_at) ?? asNumber(tagValue(note, "published_at")) ?? note.created_at,
    hashtags: extractHashtags(note, options?.hashtagLimit ?? 4),
    readingMinutes: readingMinutesFromPayload(record.reading_time_s, strippedContent),
    subject: articleSubject(asString(record.subject), title),
  };
}

function readingMinutesFromPayload(value: unknown, strippedContent: string): number | undefined {
  const seconds = asNumber(value);
  if (typeof seconds === "number" && seconds > 0) return Math.max(1, Math.round(seconds / 60));
  return estimateReadingMinutes(strippedContent);
}

function articleSubject(value: string | undefined, title: string): string | undefined {
  const subject = value?.trim();
  if (!subject || subject.toLowerCase() === title.trim().toLowerCase()) return undefined;
  return subject;
}
