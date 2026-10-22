const SHORTCODE = /^:([A-Za-z0-9_+-]{1,100}):$/;

export type ReactionDisplay = {
  /** Unicode emoji, or the short name without colons. */
  text: string;
  /** https emoji image from a NIP-30 `emoji` tag, when one matches. */
  imageUrl?: string;
};

function emojiUrl(tags: unknown, shortcode: string): string | undefined {
  if (!Array.isArray(tags)) return undefined;
  const wanted = shortcode.toLowerCase();
  for (const tag of tags) {
    if (!Array.isArray(tag) || tag.length < 3) continue;
    if (String(tag[0]).toLowerCase() !== "emoji") continue;
    if (String(tag[1]).toLowerCase() !== wanted) continue;
    const url = typeof tag[2] === "string" ? tag[2].trim() : "";
    if (url.startsWith("https://")) return url;
  }
  return undefined;
}

/**
 * Unicode reactions stay as-is. `:shortcode:` becomes an image when a matching
 * NIP-30 emoji tag has an https URL, otherwise the short name without colons.
 */
export function presentReactionContent(
  content: string | null | undefined,
  tags: unknown
): ReactionDisplay {
  const raw = typeof content === "string" && content.trim().length > 0 ? content.trim() : "+";
  const match = SHORTCODE.exec(raw);
  if (!match?.[1]) return { text: raw };
  const name = match[1];
  const imageUrl = emojiUrl(tags, name);
  return imageUrl ? { text: name, imageUrl } : { text: name };
}
