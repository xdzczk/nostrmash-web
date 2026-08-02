export type NoteMediaKind = "image" | "video" | "audio";

export interface NoteMediaAttachment {
  url: string;
  kind: NoteMediaKind;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v", ".m3u8"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);

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

/** Classify a URL as renderable note media, or null when it should stay a normal link. */
export function classifyNoteMediaUrl(value: string): NoteMediaKind | null {
  if (!isHttpsUrl(value)) return null;

  try {
    const url = new URL(value);
    const pathname = url.pathname.toLowerCase();

    for (const extension of IMAGE_EXTENSIONS) {
      if (pathname.endsWith(extension)) return "image";
    }
    for (const extension of VIDEO_EXTENSIONS) {
      if (pathname.endsWith(extension)) return "video";
    }
    for (const extension of AUDIO_EXTENSIONS) {
      if (pathname.endsWith(extension)) return "audio";
    }
  } catch {
    return null;
  }

  return null;
}

export function isNoteMediaUrl(value: string): boolean {
  return classifyNoteMediaUrl(value) !== null;
}

export function extractNoteMediaAttachments(text: string, limit = 4): NoteMediaAttachment[] {
  return extractUrls(text)
    .map((url) => {
      const kind = classifyNoteMediaUrl(url);
      return kind ? { url, kind } : null;
    })
    .filter((entry): entry is NoteMediaAttachment => entry !== null)
    .slice(0, limit);
}

function mediaHostFromUrl(value: string): string | null {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return host.length > 0 ? host : null;
  } catch {
    return null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Remove media file URLs (and compact `[host]` placeholders produced by API
 * previews) from note copy so they are never shown as text.
 */
export function stripNoteMediaUrls(text: string, rawContent: string = text): string {
  const mediaHosts = new Set(
    extractNoteMediaAttachments(rawContent)
      .map((attachment) => mediaHostFromUrl(attachment.url))
      .filter((host): host is string => Boolean(host))
  );

  let result = text.replace(/https?:\/\/\S+/g, (match) => {
    const normalized = normalizeCandidateUrl(match);
    return isNoteMediaUrl(normalized) ? "" : match;
  });

  for (const host of mediaHosts) {
    result = result.replace(new RegExp(`\\[${escapeRegExp(host)}\\]`, "gi"), "");
  }

  return result
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
