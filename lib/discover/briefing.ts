import { formatCompactNumber } from "@/components/explorer/utils";

export type Briefing = {
  headline: string;
  items: string[];
};

type TopicFact = { hashtag?: string; unique_authors?: number };
type DomainFact = { domain?: string; unique_authors?: number };

function people(count: number): string {
  return count === 1 ? "person" : "people";
}

function topicSentence(tag: string, authors: number): string {
  const name = tag.replace(/^#/, "").trim();
  return `#${name} is in notes from ${formatCompactNumber(authors)} ${people(authors)} in this window.`;
}

function domainSentence(domain: string, authors: number): string {
  return `${domain} was shared by ${formatCompactNumber(authors)} ${people(authors)} in this window.`;
}

/**
 * A headline from counts already on the homepage. Ratios stay out until the
 * API returns a baseline for the same row.
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
    sentences.push(topicSentence(tag, authors));
    if (sentences.length === 3) break;
  }
  for (const entry of input.domains ?? []) {
    const domain = typeof entry.domain === "string" ? entry.domain.trim() : "";
    const authors = entry.unique_authors;
    if (!domain || typeof authors !== "number" || !Number.isFinite(authors) || authors < 2) {
      continue;
    }
    sentences.push(domainSentence(domain, authors));
    break;
  }
  const rising = input.risingSentence?.trim();
  if (rising) sentences.push(rising);
  const headline = sentences[0];
  if (!headline) return null;
  return { headline, items: sentences.slice(1, 5) };
}
