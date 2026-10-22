import type { EventRecord } from "@/lib/types/api";

export type HighlightSource = {
  /** Full `a` coordinate, event id, or source URL, for the title tooltip. */
  title: string;
  href?: string;
  label: string;
  /** `href` is an off-site page, not an in-app note. */
  external?: boolean;
};

function tagValue(note: EventRecord, name: string): string | undefined {
  if (!Array.isArray(note.tags)) return undefined;
  for (const tag of note.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    if (String(tag[0]).toLowerCase() !== name) continue;
    if (typeof tag[1] !== "string") continue;
    const value = tag[1].trim();
    if (value.length > 0) return value;
  }
  return undefined;
}

function httpUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Where a highlight (kind 9802) was clipped from. Prefer the addressable `a`
 * tag, then an `e` tag, then an `r` URL. The subject of the event is the
 * highlighter, not the author of the quoted passage.
 */
export function highlightSource(note: EventRecord): HighlightSource | null {
  const address = tagValue(note, "a");
  if (address) {
    const identifier = address.split(":").slice(2).join(":").trim();
    return {
      title: address,
      label: identifier.length > 0 ? identifier : "an article",
    };
  }
  const eventId = tagValue(note, "e");
  if (eventId) {
    return {
      title: eventId,
      href: `/notes/${encodeURIComponent(eventId)}`,
      label: "a note",
    };
  }
  const page = httpUrl(tagValue(note, "r"));
  if (page) {
    return {
      title: page.toString(),
      href: page.toString(),
      label: page.hostname.replace(/^www\./, ""),
      external: true,
    };
  }
  return null;
}
