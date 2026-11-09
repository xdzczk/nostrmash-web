import { formatCompactNumber } from "@/components/explorer/utils";
import { baselineComparison, readEntityBaseline } from "@/lib/discover/baseline";

export type Briefing = {
  headline: string;
  items: string[];
};

type TopicFact = { hashtag?: string; unique_authors?: number; baseline?: unknown };
type DomainFact = { domain?: string; unique_authors?: number; baseline?: unknown };

/** A stored baseline counts as "ahead" once it is clearly above the usual level. */
const AHEAD_RATIO = 1.15;

function people(count: number): string {
  return count === 1 ? "person" : "people";
}

function withComparison(sentence: string, comparison: string | null): string {
  if (!comparison) return `${sentence}.`;
  return `${sentence}, ${comparison}.`;
}

function topicSentence(tag: string, authors: number, comparison: string | null): string {
  const name = tag.replace(/^#/, "").trim();
  return withComparison(
    `#${name} is in notes from ${formatCompactNumber(authors)} ${people(authors)} in this window`,
    comparison
  );
}

function domainSentence(domain: string, authors: number, comparison: string | null): string {
  return withComparison(
    `${domain} was shared by ${formatCompactNumber(authors)} ${people(authors)} in this window`,
    comparison
  );
}

function readableName(name: string | null | undefined): string | null {
  const text = name?.trim();
  if (!text || text.startsWith("npub1")) return null;
  return text;
}

function finish(sentence: string): string {
  const text = sentence.trim().replace(/\.+$/, "");
  return text.length > 0 ? `${text}.` : "";
}

/** The leading note, named when we know who wrote it. Recency alone is not a story. */
export function noteLeadSentence(
  reason: string | null | undefined,
  name: string | null | undefined
): string | null {
  const text = reason?.trim();
  if (!text || text.startsWith("Posted recently")) return null;
  const who = readableName(name);
  return finish(who ? `${text} on a note from ${who}` : text);
}

/** A person, when the reason is more than a post count. */
export function personLeadSentence(
  reason: string | null | undefined,
  name: string | null | undefined
): string | null {
  const text = reason?.trim();
  const who = readableName(name);
  if (!text || !who || text.startsWith("Published ")) return null;
  return finish(`${who}: ${text.charAt(0).toLowerCase()}${text.slice(1)}`);
}

function aheadRatio(baseline: unknown, authors: number | undefined): number | null {
  const parsed = readEntityBaseline(baseline);
  if (!parsed || parsed.metric !== "unique_authors") return null;
  if (typeof authors !== "number" || parsed.value !== authors) return null;
  const ratio = parsed.ratio;
  if (ratio === undefined || ratio < AHEAD_RATIO) return null;
  return ratio;
}

function upwardTopics(entries: TopicFact[]): string[] {
  return entries
    .flatMap((entry) => {
      const tag = typeof entry.hashtag === "string" ? entry.hashtag.trim() : "";
      const authors = entry.unique_authors;
      const ratio = aheadRatio(entry.baseline, authors);
      if (!tag || typeof authors !== "number" || authors < 2 || ratio === null) return [];
      const comparison = baselineComparison(readEntityBaseline(entry.baseline));
      return [{ ratio, sentence: topicSentence(tag, authors, comparison) }];
    })
    .sort((left, right) => right.ratio - left.ratio)
    .map((entry) => entry.sentence);
}

function upwardDomains(entries: DomainFact[]): string[] {
  return entries
    .flatMap((entry) => {
      const domain = typeof entry.domain === "string" ? entry.domain.trim() : "";
      const authors = entry.unique_authors;
      const ratio = aheadRatio(entry.baseline, authors);
      if (!domain || typeof authors !== "number" || authors < 2 || ratio === null) return [];
      const comparison = baselineComparison(readEntityBaseline(entry.baseline));
      return [{ ratio, sentence: domainSentence(domain, authors, comparison) }];
    })
    .sort((left, right) => right.ratio - left.ratio)
    .map((entry) => entry.sentence);
}

function countMovement(
  value: number | null | undefined,
  baseline: unknown,
  metric: string,
  singular: string,
  plural: string
): { sentence: string; ratio: number } | null {
  const parsed = readEntityBaseline(baseline);
  if (typeof value !== "number" || !parsed || parsed.metric !== metric || parsed.value !== value) {
    return null;
  }
  const ratio = parsed.ratio;
  if (ratio === undefined || ratio < AHEAD_RATIO) return null;
  const comparison = baselineComparison(parsed);
  if (!comparison) return null;
  const unit = value === 1 ? singular : plural;
  return {
    ratio,
    sentence: `${formatCompactNumber(value)} ${unit}, ${comparison}.`,
  };
}

/**
 * Homepage and saved-day lede. A note, a person, or the network leads.
 * A topic or link is used only when it is ahead of its usual day, and a
 * count that is merely large, flat, or down is left off.
 */
export function buildOverviewBriefing(input: {
  hashtags?: TopicFact[];
  domains?: DomainFact[];
  noteSentence?: string | null;
  personSentence?: string | null;
  networkSentence?: string | null;
  noteVolume?: number | null;
  noteVolumeBaseline?: unknown;
  activeAuthors?: number | null;
  activeAuthorsBaseline?: unknown;
}): Briefing | null {
  const networkCounts = [
    countMovement(input.noteVolume, input.noteVolumeBaseline, "note_volume", "note", "notes"),
    countMovement(
      input.activeAuthors,
      input.activeAuthorsBaseline,
      "active_authors",
      "person",
      "people"
    ),
  ]
    .filter((entry): entry is { sentence: string; ratio: number } => entry !== null)
    .sort((left, right) => right.ratio - left.ratio)
    .map((entry) => entry.sentence);

  const ordered = [
    input.noteSentence,
    input.personSentence,
    input.networkSentence,
    ...networkCounts,
    ...upwardDomains(input.domains ?? []),
    ...upwardTopics(input.hashtags ?? []),
  ];

  const sentences: string[] = [];
  for (const entry of ordered) {
    const text = entry?.trim();
    if (!text || sentences.includes(text)) continue;
    sentences.push(text.endsWith(".") ? text : `${text}.`);
  }
  const headline = sentences[0];
  if (!headline) return null;
  return { headline, items: sentences.slice(1, 5) };
}
