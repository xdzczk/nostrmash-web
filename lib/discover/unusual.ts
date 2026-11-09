import { readEntityBaseline } from "@/lib/discover/baseline";
import type { DomainEntry, HashtagEntry } from "@/lib/types/api";
import type { DomainMomentum, HashtagMomentum } from "@/lib/types/surfaces";

/** Same threshold as the homepage briefing: clearly ahead of the usual day. */
const AHEAD_RATIO = 1.15;

function aheadOfUsualDay(baseline: unknown, authors: number | undefined): boolean {
  const parsed = readEntityBaseline(baseline);
  if (!parsed || parsed.metric !== "unique_authors") return false;
  if (typeof authors !== "number" || parsed.value !== authors) return false;
  return parsed.ratio !== undefined && parsed.ratio >= AHEAD_RATIO;
}

/**
 * Topics that are both accelerating and ahead of their usual day.
 * A tag with no usual day, or one that is flat or down, is not "moving faster."
 */
export function unusualHashtags(
  emerging: readonly HashtagMomentum[],
  ranked: readonly HashtagEntry[]
): string[] {
  const byTag = new Map<string, HashtagEntry>();
  for (const entry of ranked) {
    const tag = entry.hashtag?.replace(/^#/, "").trim().toLowerCase();
    if (tag) byTag.set(tag, entry);
  }
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of emerging) {
    const tag = item.hashtag.replace(/^#/, "").trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    const known = byTag.get(tag);
    if (!known || !aheadOfUsualDay(known.baseline, known.unique_authors)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags;
}

/**
 * Links that are both accelerating and ahead of their usual day.
 * A domain with no stored pace is not described as moving faster than one.
 */
export function unusualDomains(
  emerging: readonly DomainMomentum[],
  ranked: readonly DomainEntry[]
): string[] {
  const byDomain = new Map<string, DomainEntry>();
  for (const entry of ranked) {
    const domain = entry.domain?.trim().toLowerCase();
    if (domain) byDomain.set(domain, entry);
  }
  const seen = new Set<string>();
  const domains: string[] = [];
  for (const item of emerging) {
    const domain = item.domain.trim().toLowerCase();
    if (!domain || seen.has(domain)) continue;
    const known = byDomain.get(domain);
    if (!known || !aheadOfUsualDay(known.baseline, known.unique_authors)) continue;
    seen.add(domain);
    domains.push(domain);
  }
  return domains;
}
