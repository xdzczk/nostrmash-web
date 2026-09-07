/** Shared URL / hashtag extraction so tokenize, previews, and footer chips agree. */

export const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;
export const HASHTAG_PATTERN = /(?<![\w/])#([a-zA-Z0-9_]{1,64})\b/g;
/** Host + optional path/query, not preceded by `@`, `/`, or a word character. */
export const BARE_HOST_PATTERN =
  /(?<![@/\w])((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24})(?:[/?#][^\s<>"'`]*)?/gi;

const FILE_EXTENSION_TLDS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "svg",
  "bmp",
  "ico",
  "tif",
  "tiff",
  "mp4",
  "webm",
  "mov",
  "mkv",
  "avi",
  "mp3",
  "wav",
  "flac",
  "ogg",
  "pdf",
  "md",
  "txt",
  "rtf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "csv",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "json",
  "css",
  "map",
  "wasm",
  "zip",
  "tar",
  "gz",
  "tgz",
  "rar",
  "exe",
  "dmg",
  "pkg",
  "iso",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "yml",
  "yaml",
  "lock",
  "log",
]);

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

function hostTld(hostname: string): string {
  const parts = hostname.toLowerCase().replace(/\.$/, "").split(".");
  return parts[parts.length - 1] ?? "";
}

function isLinkableBareHost(hostname: string): boolean {
  const tld = hostTld(hostname);
  if (!tld || FILE_EXTENSION_TLDS.has(tld)) return false;
  if (!/^[a-z]{2,24}$/.test(tld)) return false;
  return hostname.includes(".");
}

/** Absolute http(s) href, including `https://` for schemeless hosts. */
export function toAbsoluteHttpUrl(raw: string): string | null {
  const { href } = trimUrlTrailingPunctuation(raw.trim());
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) {
    try {
      const parsed = new URL(href);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
    } catch {
      return href;
    }
  }
  if (!isLinkableBareHost(href.split(/[/?#]/, 1)[0] ?? "")) return null;
  try {
    const parsed = new URL(`https://${href}`);
    if (!isLinkableBareHost(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Deduped http(s) URLs with trailing punctuation removed. Scheme required. */
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

/** Scheme URLs plus schemeless hosts rewritten to `https://`. */
export function extractLinkableUrls(text: string): string[] {
  if (!text) return [];
  const hrefs = new Set<string>();
  for (const href of extractUrls(text)) {
    const absolute = toAbsoluteHttpUrl(href);
    if (absolute) hrefs.add(absolute);
  }
  for (const match of text.matchAll(cloneGlobalPattern(BARE_HOST_PATTERN))) {
    const absolute = toAbsoluteHttpUrl(match[0]);
    if (absolute) hrefs.add(absolute);
  }
  return Array.from(hrefs);
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
