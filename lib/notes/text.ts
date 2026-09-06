/** Shared URL / hashtag extraction so tokenize, previews, and footer chips agree. */

export const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;
export const HASHTAG_PATTERN = /(?<![\w/])#([a-zA-Z0-9_]{1,64})\b/g;

export function trimUrlTrailingPunctuation(raw: string): { href: string; trailing: string } {
  let href = raw;
  let trailing = "";
  while (/[.,;:!?)\]}'"]$/.test(href)) {
    trailing = href.slice(-1) + trailing;
    href = href.slice(0, -1);
  }
  return { href, trailing };
}

function cloneGlobalPattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}

/** Deduped http(s) URLs with trailing punctuation removed. */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(cloneGlobalPattern(URL_PATTERN)) ?? [];
  const deduped = new Set<string>();
  for (const match of matches) {
    const { href } = trimUrlTrailingPunctuation(match);
    if (href.length > 0) deduped.add(href);
  }
  return Array.from(deduped);
}

/** Lowercased hashtag tags (no #) using the same rules as note tokenization. */
export function extractHashtagsFromText(text: string): string[] {
  if (!text) return [];
  const hashtags: string[] = [];
  for (const match of text.matchAll(cloneGlobalPattern(HASHTAG_PATTERN))) {
    const tag = (match[1] ?? "").toLowerCase();
    if (tag) hashtags.push(tag);
  }
  return Array.from(new Set(hashtags));
}
