import { stripNoteMediaUrls } from "@/lib/notes/media";

const ELLIPSIS = "…";

/**
 * Collapse paragraph breaks and runs of whitespace into single spaces so a
 * line-clamped preview spends every line on words. "TITLE\n\nBody…" would
 * otherwise burn one of three clamp lines on the blank line.
 */
export function collapsePreviewWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Plain-text summary of note content for `<meta name="description">`, JSON-LD
 * headlines, and feed titles: media URLs, `nostr:` references, and bare
 * identifiers are removed, whitespace collapsed, and the result is truncated
 * at a word boundary (never mid-URL or mid-word).
 */
export function summarizeNoteText(content: unknown, maxLength = 160): string {
  if (typeof content !== "string") return "";
  const withoutMedia = stripNoteMediaUrls(content);
  const cleaned = withoutMedia
    .replace(/nostr:[a-z0-9]+/gi, "")
    .replace(/\b(nevent|note|npub|nprofile|naddr)1[a-z0-9]{20,}\b/gi, "")
    .replace(/https?:\/\/\S+/gi, (match) => {
      try {
        return new URL(match).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) return cleaned;

  const room = Math.max(1, maxLength - ELLIPSIS.length);
  const slice = cleaned.slice(0, room + 1);
  const lastBreak = slice.lastIndexOf(" ");
  const head = (lastBreak > room * 0.6 ? slice.slice(0, lastBreak) : cleaned.slice(0, room))
    .replace(/[\s,;:.!?…-]+$/u, "")
    .trimEnd();
  return `${head}${ELLIPSIS}`;
}
