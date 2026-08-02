import { isNoteMediaUrl } from "@/lib/notes/media";

function normalizeCandidateUrl(value: string): string {
  return value.replace(/[),.;!?]+$/g, "");
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/\S+/g) ?? [];
  const deduped = new Set<string>();

  for (const match of matches) {
    const normalized = normalizeCandidateUrl(match);
    if (normalized.length > 0) {
      deduped.add(normalized);
    }
  }

  return Array.from(deduped);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function linkHostFromUrl(value: string): string | null {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return host.length > 0 ? host : null;
  } catch {
    return null;
  }
}

/** Non-media https links eligible for Open Graph preview cards. */
export function extractNoteLinkUrls(text: string, limit = 2): string[] {
  return extractUrls(text)
    .filter((url) => isHttpsUrl(url) && !isNoteMediaUrl(url))
    .slice(0, Math.max(0, limit));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Remove link-preview candidate URLs (and compact `[host]` placeholders) from
 * note copy so cards own that presentation.
 */
export function stripNoteLinkPreviewUrls(
  text: string,
  rawContent: string = text,
  limit = 2
): string {
  const linkUrls = new Set(extractNoteLinkUrls(rawContent, limit));
  const linkHosts = new Set(
    Array.from(linkUrls)
      .map((url) => linkHostFromUrl(url))
      .filter((host): host is string => Boolean(host))
  );

  let result = text.replace(/https?:\/\/\S+/g, (match) => {
    const normalized = normalizeCandidateUrl(match);
    return linkUrls.has(normalized) ? "" : match;
  });

  for (const host of linkHosts) {
    result = result.replace(new RegExp(`\\[${escapeRegExp(host)}\\]`, "gi"), "");
  }

  return result
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
