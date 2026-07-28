import { decodeNip19, stripNostrPrefix } from "@/lib/nostr/nip19";

const HEX_64 = /^[0-9a-f]{64}$/i;
const BECH32_NOTE = /^note1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,}$/i;
const BECH32_NEVENT = /^nevent1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,}$/i;
const BECH32_NPUB = /^npub1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,}$/i;
const BECH32_NPROFILE = /^nprofile1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,}$/i;
const DOMAIN_HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const RELAY_HOST = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?(?::\d{1,5})?$/i;

export function isValidEventIdParam(value: string): boolean {
  const trimmed = stripNostrPrefix(value);
  if (!trimmed) return false;
  if (HEX_64.test(trimmed)) return true;
  if (BECH32_NOTE.test(trimmed) || BECH32_NEVENT.test(trimmed)) {
    const decoded = decodeNip19(trimmed);
    return decoded?.type === "note" || decoded?.type === "nevent";
  }
  return false;
}

export function isValidPubkeyOrNpubParam(value: string): boolean {
  const trimmed = stripNostrPrefix(value);
  if (!trimmed) return false;
  if (HEX_64.test(trimmed)) return true;
  if (BECH32_NPUB.test(trimmed) || BECH32_NPROFILE.test(trimmed)) {
    const decoded = decodeNip19(trimmed);
    return decoded?.type === "npub" || decoded?.type === "nprofile";
  }
  return false;
}

/** Resolve a route param to a hex event id when possible. */
export function resolveEventIdParam(value: string): string | null {
  const trimmed = stripNostrPrefix(value);
  if (!trimmed) return null;
  if (HEX_64.test(trimmed)) return trimmed.toLowerCase();
  const decoded = decodeNip19(trimmed);
  if (decoded?.type === "note") return decoded.data;
  if (decoded?.type === "nevent") return decoded.data.id;
  return null;
}

/** Resolve a route param to a hex pubkey when possible. */
export function resolvePubkeyParam(value: string): string | null {
  const trimmed = stripNostrPrefix(value);
  if (!trimmed) return null;
  if (HEX_64.test(trimmed)) return trimmed.toLowerCase();
  const decoded = decodeNip19(trimmed);
  if (decoded?.type === "npub") return decoded.data;
  if (decoded?.type === "nprofile") return decoded.data.pubkey;
  return null;
}

export function isValidDomainParam(value: string): boolean {
  const decoded = decodeURIComponent(value).trim().toLowerCase().replace(/\.$/, "");
  if (!decoded || decoded.includes("/") || decoded.includes(" ")) return false;
  const hostname = decoded.includes("://")
    ? (() => {
        try {
          return new URL(decoded).hostname.toLowerCase();
        } catch {
          return "";
        }
      })()
    : decoded.replace(/^www\./, "");
  return DOMAIN_HOSTNAME.test(hostname);
}

export function isValidRelayHostParam(value: string): boolean {
  const decoded = decodeURIComponent(value).trim().toLowerCase();
  if (!decoded) return false;
  const withoutScheme = decoded.replace(/^wss?:\/\//, "").replace(/\/+$/, "");
  if (!withoutScheme || withoutScheme.includes("/") || withoutScheme.includes(" ")) {
    return false;
  }
  return RELAY_HOST.test(withoutScheme);
}

export function normalizeValidatedDomain(value: string): string | null {
  if (!isValidDomainParam(value)) return null;
  const decoded = decodeURIComponent(value).trim().toLowerCase();
  try {
    const candidate = decoded.includes("://") ? decoded : `https://${decoded}`;
    return new URL(candidate).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return decoded.replace(/^www\./, "").replace(/\.$/, "");
  }
}

export function normalizeValidatedRelayHost(value: string): string | null {
  if (!isValidRelayHostParam(value)) return null;
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/^wss?:\/\//, "")
    .replace(/\/+$/, "");
}
