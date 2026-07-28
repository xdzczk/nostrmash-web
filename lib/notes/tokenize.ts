import { decodeNip19, type Nip19Decoded } from "@/lib/nostr/nip19";

export type NoteToken =
  | { type: "text"; value: string }
  | { type: "url"; value: string; href: string }
  | { type: "hashtag"; value: string; tag: string }
  | { type: "mention"; value: string; pubkey: string; relays?: string[] }
  | { type: "event"; value: string; id: string; author?: string; kind?: number; relays?: string[] }
  | {
      type: "address";
      value: string;
      identifier: string;
      pubkey: string;
      kind: number;
      relays?: string[];
    }
  | { type: "redacted"; value: string; reason: "nsec" };

const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;
const HASHTAG_PATTERN = /(?<![\w/])#([a-zA-Z0-9_]{1,64})\b/g;
const BECH32_PATTERN =
  /(?:nostr:)?(npub|nsec|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,}/gi;

type Match = { start: number; end: number; token: NoteToken };

function trimUrlTrailingPunctuation(raw: string): { href: string; trailing: string } {
  let href = raw;
  let trailing = "";
  while (/[.,;:!?)\]}'"]$/.test(href)) {
    trailing = href.slice(-1) + trailing;
    href = href.slice(0, -1);
  }
  return { href, trailing };
}

function entityToToken(raw: string, decoded: Nip19Decoded): NoteToken | null {
  switch (decoded.type) {
    case "nsec":
      return { type: "redacted", value: raw, reason: "nsec" };
    case "npub":
      return { type: "mention", value: raw, pubkey: decoded.data };
    case "nprofile":
      return {
        type: "mention",
        value: raw,
        pubkey: decoded.data.pubkey,
        relays: decoded.data.relays,
      };
    case "note":
      return { type: "event", value: raw, id: decoded.data };
    case "nevent":
      return {
        type: "event",
        value: raw,
        id: decoded.data.id,
        author: decoded.data.author,
        kind: decoded.data.kind,
        relays: decoded.data.relays,
      };
    case "naddr":
      return {
        type: "address",
        value: raw,
        identifier: decoded.data.identifier,
        pubkey: decoded.data.pubkey,
        kind: decoded.data.kind,
        relays: decoded.data.relays,
      };
    default:
      return null;
  }
}

function collectMatches(content: string): Match[] {
  const matches: Match[] = [];

  for (const match of content.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    const { href, trailing } = trimUrlTrailingPunctuation(match[0]);
    if (!href) continue;
    matches.push({
      start,
      end: start + href.length,
      token: { type: "url", value: href, href },
    });
    void trailing;
  }

  for (const match of content.matchAll(BECH32_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    // Skip if already covered by a URL match (e.g. inside a path — rare).
    if (matches.some((existing) => start < existing.end && end > existing.start)) continue;
    const decoded = decodeNip19(raw);
    if (!decoded) continue;
    const token = entityToToken(raw, decoded);
    if (!token) continue;
    matches.push({ start, end, token });
  }

  for (const match of content.matchAll(HASHTAG_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (matches.some((existing) => start < existing.end && end > existing.start)) continue;
    const tag = (match[1] ?? "").toLowerCase();
    if (!tag) continue;
    matches.push({
      start,
      end,
      token: { type: "hashtag", value: match[0], tag },
    });
  }

  return matches.sort((a, b) => a.start - b.start || b.end - a.end);
}

/** Tokenize note content into linkified / redacted segments. */
export function tokenizeNoteContent(content: string): NoteToken[] {
  if (!content) return [{ type: "text", value: "" }];

  const matches = collectMatches(content);
  const tokens: NoteToken[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) {
      tokens.push({ type: "text", value: content.slice(cursor, match.start) });
    }
    tokens.push(match.token);
    cursor = match.end;
  }

  if (cursor < content.length) {
    tokens.push({ type: "text", value: content.slice(cursor) });
  }

  return tokens.length > 0 ? tokens : [{ type: "text", value: content }];
}

/** Collect referenced pubkeys / event ids for batch hydration. */
export function collectTokenReferences(tokens: NoteToken[]): {
  pubkeys: string[];
  eventIds: string[];
} {
  const pubkeys = new Set<string>();
  const eventIds = new Set<string>();
  for (const token of tokens) {
    if (token.type === "mention") pubkeys.add(token.pubkey);
    if (token.type === "event") {
      eventIds.add(token.id);
      if (token.author) pubkeys.add(token.author);
    }
    if (token.type === "address") pubkeys.add(token.pubkey);
  }
  return { pubkeys: [...pubkeys], eventIds: [...eventIds] };
}
