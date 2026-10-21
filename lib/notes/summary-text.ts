/**
 * Collapse paragraph breaks and runs of whitespace into single spaces so a
 * line-clamped preview spends every line on words. "TITLE\n\nBody…" would
 * otherwise burn one of three clamp lines on the blank line.
 */
export function collapsePreviewWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
