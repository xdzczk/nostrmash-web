import { decodeNip19, type Nip19Decoded } from "@/lib/nostr/nip19";
import { HASHTAG_PATTERN, trimUrlTrailingPunctuation, URL_PATTERN } from "@/lib/notes/text";

export type NoteToken =
  | { type: "text"; value: string }
  | { type: "url"; value: string; href: string }
  | { type: "hashtag"; value: string; tag: string }
  | { type: "mention"; value: string; pubkey: string; relays?: string[] }
  | { type: "handle"; value: string; handle: string }
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

export type TokenizeOptions = {
  tags?: unknown;
};

const HEX_64 = /^[0-9a-f]{64}$/i;
const BECH32_ENTITY_PREFIX = /^(?:npub|nsec|note|nprofile|nevent|naddr|nrelay)1/i;
const BECH32_PATTERN =
  /(?:nostr:)?(npub|nsec|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,}/gi;
const NIP08_PATTERN = /#\[(\d+)\]/g;
const HANDLE_PATTERN =
  /(?<![A-Za-z0-9_/])@([A-Za-z0-9_.-]{1,64}(?:@[A-Za-z0-9.-]+\.[A-Za-z]{2,24})?)/g;

type Match = { start: number; end: number; token: NoteToken };

export function normalizeEventTags(tags: unknown): string[][] {
  if (!Array.isArray(tags)) return [];
  const normalized: string[][] = [];
  for (const tag of tags) {
    if (!Array.isArray(tag)) continue;
    const parts = tag.filter((part): part is string => typeof part === "string");
    if (parts.length >= 2) normalized.push(parts);
  }
  return normalized;
}

export function parseAddressPointer(
  value: string
): { kind: number; pubkey: string; identifier: string } | null {
  const firstColon = value.indexOf(":");
  const secondColon = firstColon >= 0 ? value.indexOf(":", firstColon + 1) : -1;
  if (firstColon <= 0 || secondColon <= firstColon) return null;
  const kind = Number(value.slice(0, firstColon));
  const pubkey = value.slice(firstColon + 1, secondColon);
  const identifier = value.slice(secondColon + 1);
  if (!Number.isInteger(kind) || kind < 0 || !HEX_64.test(pubkey)) return null;
  return { kind, pubkey: pubkey.toLowerCase(), identifier };
}

function overlaps(matches: Match[], start: number, end: number): boolean {
  return matches.some((existing) => start < existing.end && end > existing.start);
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

function isMentionEntity(decoded: Nip19Decoded): boolean {
  return decoded.type === "npub" || decoded.type === "nprofile";
}

function tagToToken(tag: string[] | undefined, raw: string): NoteToken | null {
  if (!tag || tag.length < 2) return null;
  const kind = tag[0];
  const value = tag[1];
  if (!kind || !value) return null;
  if (kind === "p" && HEX_64.test(value)) {
    return { type: "mention", value: raw, pubkey: value.toLowerCase() };
  }
  if (kind === "e" && HEX_64.test(value)) {
    return { type: "event", value: raw, id: value.toLowerCase() };
  }
  if (kind === "a") {
    const pointer = parseAddressPointer(value);
    if (!pointer) return null;
    return { type: "address", value: raw, ...pointer };
  }
  return null;
}

function collectMatches(content: string, tags: string[][]): Match[] {
  const matches: Match[] = [];

  for (const match of content.matchAll(new RegExp(URL_PATTERN.source, URL_PATTERN.flags))) {
    const start = match.index ?? 0;
    const { href } = trimUrlTrailingPunctuation(match[0]);
    if (!href) continue;
    matches.push({
      start,
      end: start + href.length,
      token: { type: "url", value: href, href },
    });
  }

  for (const match of content.matchAll(new RegExp(BECH32_PATTERN.source, BECH32_PATTERN.flags))) {
    const raw = match[0];
    let start = match.index ?? 0;
    const end = start + raw.length;
    const decoded = decodeNip19(raw);
    if (!decoded) continue;
    const token = entityToToken(raw, decoded);
    if (!token) continue;
    // Consume a leading @ so `@npub1…` does not render as `@@Alice`.
    if (start > 0 && content[start - 1] === "@" && isMentionEntity(decoded)) {
      start -= 1;
    }
    if (overlaps(matches, start, end)) continue;
    matches.push({ start, end, token });
  }

  for (const match of content.matchAll(new RegExp(NIP08_PATTERN.source, NIP08_PATTERN.flags))) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (overlaps(matches, start, end)) continue;
    const index = Number(match[1]);
    if (!Number.isInteger(index) || index < 0) continue;
    const token = tagToToken(tags[index], match[0]);
    if (!token) continue;
    matches.push({ start, end, token });
  }

  for (const match of content.matchAll(new RegExp(HASHTAG_PATTERN.source, HASHTAG_PATTERN.flags))) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (overlaps(matches, start, end)) continue;
    const tag = (match[1] ?? "").toLowerCase();
    if (!tag) continue;
    matches.push({
      start,
      end,
      token: { type: "hashtag", value: match[0], tag },
    });
  }

  for (const match of content.matchAll(new RegExp(HANDLE_PATTERN.source, HANDLE_PATTERN.flags))) {
    let handle = match[1] ?? "";
    handle = handle.replace(/[.-]+$/g, "");
    if (!handle || BECH32_ENTITY_PREFIX.test(handle)) continue;
    const start = match.index ?? 0;
    const end = start + 1 + handle.length;
    if (overlaps(matches, start, end)) continue;
    matches.push({
      start,
      end,
      token: { type: "handle", value: `@${handle}`, handle },
    });
  }

  return matches.sort((a, b) => a.start - b.start || b.end - a.end);
}

/** Tokenize note content into linkified / redacted segments. */
export function tokenizeNoteContent(content: string, options?: TokenizeOptions): NoteToken[] {
  if (!content) return [{ type: "text", value: "" }];

  const matches = collectMatches(content, normalizeEventTags(options?.tags));
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

/** Extra p/e pointers used to resolve bare `@handle` mentions. */
export function collectHandleSupportReferences(tags: unknown): {
  pubkeys: string[];
  eventIds: string[];
} {
  const pubkeys = new Set<string>();
  const eventIds = new Set<string>();
  for (const tag of normalizeEventTags(tags)) {
    if (tag[0] === "p" && HEX_64.test(tag[1] ?? "")) pubkeys.add(tag[1]!.toLowerCase());
    if (tag[0] === "e" && HEX_64.test(tag[1] ?? "")) eventIds.add(tag[1]!.toLowerCase());
    if (tag[0] === "a") {
      const pointer = parseAddressPointer(tag[1] ?? "");
      if (pointer) pubkeys.add(pointer.pubkey);
    }
  }
  return { pubkeys: [...pubkeys], eventIds: [...eventIds] };
}
