import { isValidHashtag } from "@/lib/hashtags";
import { stripNostrPrefix, decodeNip19 } from "@/lib/nostr/nip19";
import {
  isValidDomainParam,
  isValidRelayHostParam,
  normalizeValidatedDomain,
  normalizeValidatedRelayHost,
  resolveEventIdParam,
  resolvePubkeyParam,
} from "@/lib/routing/params";

const HEX_64 = /^[0-9a-f]{64}$/i;

export type SearchIntentKind = "hashtag" | "note" | "profile" | "relay" | "domain" | "hex" | "text";

export type SearchIntent = {
  kind: SearchIntentKind;
  /** Present when the query should open an object instead of the results page. */
  href?: string;
  normalized: string;
};

function domainHref(value: string): { href: string; normalized: string } | null {
  if (value.includes(" ") || value.includes("@") || /^wss?:\/\//i.test(value)) return null;
  let host = value;
  if (value.includes("://") || value.includes("/")) {
    try {
      host = new URL(value.includes("://") ? value : `https://${value}`).hostname;
    } catch {
      return null;
    }
  }
  if (!isValidDomainParam(host)) return null;
  const normalized = normalizeValidatedDomain(host);
  if (!normalized) return null;
  return { href: `/domains/${encodeURIComponent(normalized)}`, normalized };
}

/**
 * Decide whether a query is an object (hashtag, note, person, relay, domain)
 * or text. A bare 64-hex string is ambiguous between a note id and a pubkey,
 * so it stays on the search page for the server to resolve. `nsec` is never
 * routed.
 */
export function resolveSearchIntent(raw: string): SearchIntent {
  const trimmed = raw.trim();
  const stripped = stripNostrPrefix(trimmed);
  if (!stripped) return { kind: "text", normalized: "" };

  if (stripped.startsWith("#")) {
    const tag = stripped.slice(1).trim().toLowerCase();
    if (isValidHashtag(tag)) {
      return {
        kind: "hashtag",
        normalized: tag,
        href: `/hashtags/${encodeURIComponent(tag)}/notes`,
      };
    }
  }

  const decoded = decodeNip19(stripped);
  if (decoded?.type === "note" || decoded?.type === "nevent") {
    const id = resolveEventIdParam(stripped);
    if (id) return { kind: "note", normalized: id, href: `/notes/${id}` };
  }
  if (decoded?.type === "npub" || decoded?.type === "nprofile") {
    const pubkey = resolvePubkeyParam(stripped);
    if (pubkey) return { kind: "profile", normalized: pubkey, href: `/profiles/${pubkey}` };
  }

  if (/^wss?:\/\//i.test(stripped) && isValidRelayHostParam(stripped)) {
    const host = normalizeValidatedRelayHost(stripped);
    if (host)
      return { kind: "relay", normalized: host, href: `/relays/${encodeURIComponent(host)}` };
  }

  if (HEX_64.test(stripped)) {
    return { kind: "hex", normalized: stripped.toLowerCase() };
  }

  const domain = domainHref(stripped);
  if (domain) return { kind: "domain", href: domain.href, normalized: domain.normalized };

  return { kind: "text", normalized: trimmed };
}
