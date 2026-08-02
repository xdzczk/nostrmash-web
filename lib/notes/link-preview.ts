import { parseTwitterStatusId } from "@/lib/notes/embeds";

export type TweetPreview = {
  text: string;
  author_name: string;
  author_handle: string;
  avatar_url?: string;
  created_at?: string;
  media_url?: string;
};

export type LinkPreviewResult = {
  url: string;
  domain: string;
  provider?: "twitter" | "generic";
  title?: string;
  description?: string;
  image_url?: string;
  site_name?: string;
  tweet?: TweetPreview;
};

const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 512_000;
const FETCH_TIMEOUT_MS = 4_000;
const FXTWITTER_HOST = "api.fxtwitter.com";

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const a = parts[0]!;
  const b = parts[1]!;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

/** Reject URLs that would be unsafe to fetch from the unfurl worker. */
export function assertSafePreviewUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("https_required");
  }
  if (parsed.username || parsed.password) {
    throw new Error("credentials_forbidden");
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".intranet") ||
    host === "0.0.0.0"
  ) {
    throw new Error("private_host");
  }

  if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
    throw new Error("private_host");
  }

  return parsed;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    });
}

function cleanText(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined;
  const cleaned = decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned;
}

function metaContent(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function titleTag(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1];
}

function absolutizeUrl(base: URL, value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const absolute = new URL(value, base);
    if (absolute.protocol !== "https:") return undefined;
    return absolute.toString();
  } catch {
    return undefined;
  }
}

export function parseLinkPreviewHtml(html: string, finalUrl: URL): LinkPreviewResult {
  const domain = finalUrl.hostname.toLowerCase().replace(/^www\./, "");
  const title =
    cleanText(metaContent(html, "og:title"), 140) ??
    cleanText(metaContent(html, "twitter:title"), 140) ??
    cleanText(titleTag(html), 140);
  const description =
    cleanText(metaContent(html, "og:description"), 220) ??
    cleanText(metaContent(html, "twitter:description"), 220) ??
    cleanText(metaContent(html, "description"), 220);
  const image_url =
    absolutizeUrl(finalUrl, metaContent(html, "og:image")) ??
    absolutizeUrl(finalUrl, metaContent(html, "twitter:image"));
  const site_name = cleanText(metaContent(html, "og:site_name"), 80);

  return {
    url: finalUrl.toString(),
    domain,
    provider: "generic",
    title,
    description,
    image_url,
    site_name,
  };
}

type FxTwitterPayload = {
  code?: number;
  tweet?: {
    url?: string;
    text?: string;
    created_at?: string;
    author?: {
      name?: string;
      screen_name?: string;
      avatar_url?: string;
    };
    media?: {
      photos?: Array<{ url?: string }>;
      videos?: Array<{ thumbnail_url?: string; url?: string }>;
    };
  };
};

function firstHttps(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Map FxTwitter JSON into our preview card shape. */
export function mapFxTwitterPayload(
  payload: FxTwitterPayload,
  fallbackUrl: string
): LinkPreviewResult | null {
  const tweet = payload.tweet;
  if (!tweet || payload.code !== 200) return null;

  const text = cleanText(tweet.text, 480);
  const authorName = cleanText(tweet.author?.name, 80);
  const authorHandle = cleanText(tweet.author?.screen_name, 80);
  if (!text || !authorName || !authorHandle) return null;

  const media_url =
    firstHttps(tweet.media?.photos?.[0]?.url) ??
    firstHttps(tweet.media?.videos?.[0]?.thumbnail_url) ??
    firstHttps(tweet.media?.videos?.[0]?.url);
  const avatar_url = firstHttps(tweet.author?.avatar_url);
  const url = firstHttps(tweet.url) ?? fallbackUrl;

  return {
    url,
    domain: "x.com",
    provider: "twitter",
    title: `${authorName} (@${authorHandle})`,
    description: text,
    image_url: media_url,
    site_name: "X",
    tweet: {
      text,
      author_name: authorName,
      author_handle: authorHandle,
      avatar_url,
      created_at: cleanText(tweet.created_at, 64),
      media_url,
    },
  };
}

async function fetchTwitterPreview(
  statusId: string,
  fallbackUrl: string
): Promise<LinkPreviewResult> {
  const endpoint = assertSafePreviewUrl(`https://${FXTWITTER_HOST}/status/${statusId}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "NostrMashLinkPreview/1.0 (+https://nostrmash.com)",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      throw new Error("redirect_forbidden");
    }
    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("application/json")) {
      throw new Error("invalid_content_type");
    }

    const body = await readBodyText(response);
    const payload = JSON.parse(body) as FxTwitterPayload;
    const mapped = mapFxTwitterPayload(payload, fallbackUrl);
    if (!mapped) throw new Error("tweet_missing");
    return mapped;
  } finally {
    clearTimeout(timer);
  }
}

async function readBodyText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return text.slice(0, MAX_BODY_BYTES);
  }

  const decoder = new TextDecoder("utf-8", { fatal: false });
  let received = 0;
  let result = "";
  while (received < MAX_BODY_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const remaining = MAX_BODY_BYTES - received;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    received += chunk.byteLength;
    result += decoder.decode(chunk, { stream: true });
    if (value.byteLength > remaining) break;
  }
  result += decoder.decode();
  try {
    await reader.cancel();
  } catch {
    // ignore cancel errors
  }
  return result;
}

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreviewResult> {
  let current = assertSafePreviewUrl(rawUrl);

  const statusId = parseTwitterStatusId(current.toString());
  if (statusId) {
    try {
      return await fetchTwitterPreview(statusId, current.toString());
    } catch {
      // Fall through to generic OG / domain card.
    }
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "User-Agent": "NostrMashLinkPreview/1.0 (+https://nostrmash.com)",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("redirect_missing");
        current = assertSafePreviewUrl(new URL(location, current).toString());
        continue;
      }

      if (!response.ok) {
        throw new Error(`http_${response.status}`);
      }

      const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        // Non-HTML target: still return a domain-only fallback card.
        return {
          url: current.toString(),
          domain: current.hostname.toLowerCase().replace(/^www\./, ""),
          provider: "generic",
        };
      }

      const html = await readBodyText(response);
      return parseLinkPreviewHtml(html, current);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("too_many_redirects");
}
