const MAX_QUERY_LENGTH = 64;
const MIN_LIMIT = 1;
const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 8;

export function clampSuggestQuery(raw: string): string {
  return raw.trim().slice(0, MAX_QUERY_LENGTH);
}

export function clampSuggestLimit(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? String(DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parsed));
}

export function clientIpFromRequest(headers: Headers): string {
  const cfConnectingIp = headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Address safe to send as `CF-Connecting-IP`. Cloudflare rejects missing,
 * loopback, and other non-public values with error 1000, which fails suggest.
 */
export function forwardableClientIp(ip: string): string | undefined {
  const trimmed = ip.trim();
  if (!/^[\da-f:.]+$/i.test(trimmed)) return undefined;
  const v4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.exec(trimmed);
  if (v4) {
    const octets = trimmed.split(".").map((octet) => Number(octet));
    if (octets.some((octet) => octet > 255)) return undefined;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return undefined;
    if (a === 169 && b === 254) return undefined;
    if (a === 172 && b >= 16 && b <= 31) return undefined;
    if (a === 192 && b === 168) return undefined;
    return trimmed;
  }
  if (!trimmed.includes(":")) return undefined;
  const lower = trimmed.toLowerCase();
  if (
    lower === "::1" ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd")
  ) {
    return undefined;
  }
  if (lower.startsWith("::ffff:")) return forwardableClientIp(trimmed.slice("::ffff:".length));
  return trimmed;
}
