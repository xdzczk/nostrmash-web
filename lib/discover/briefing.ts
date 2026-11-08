import { formatCompactNumber } from "@/components/explorer/utils";
import { authorBaselineComparison } from "@/lib/discover/baseline";

export type Briefing = {
  headline: string;
  items: string[];
};

type TopicFact = { hashtag?: string; unique_authors?: number; baseline?: unknown };
type DomainFact = { domain?: string; unique_authors?: number; baseline?: unknown };

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

/**
 * A headline from counts already on the homepage. A comparison is added only
 * when that row carries a baseline for the same author count.
 */
export function buildOverviewBriefing(input: {
  hashtags?: TopicFact[];
  domains?: DomainFact[];
  risingSentence?: string | null;
}): Briefing | null {
  const sentences: string[] = [];
  for (const entry of input.hashtags ?? []) {
    const tag = typeof entry.hashtag === "string" ? entry.hashtag.trim() : "";
    const authors = entry.unique_authors;
    if (!tag || typeof authors !== "number" || !Number.isFinite(authors) || authors < 2) continue;
    sentences.push(topicSentence(tag, authors, authorBaselineComparison(entry.baseline, authors)));
    if (sentences.length === 3) break;
  }
  for (const entry of input.domains ?? []) {
    const domain = typeof entry.domain === "string" ? entry.domain.trim() : "";
    const authors = entry.unique_authors;
    if (!domain || typeof authors !== "number" || !Number.isFinite(authors) || authors < 2) {
      continue;
    }
    sentences.push(
      domainSentence(domain, authors, authorBaselineComparison(entry.baseline, authors))
    );
    break;
  }
  const rising = input.risingSentence?.trim();
  if (rising) sentences.push(rising);
  const headline = sentences[0];
  if (!headline) return null;
  return { headline, items: sentences.slice(1, 5) };
}
