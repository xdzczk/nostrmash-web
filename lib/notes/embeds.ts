export type EmbedProvider = "youtube" | "twitter" | "generic";

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const TWITTER_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);

/** Extract a YouTube video id from common watch/shorts/live/embed/youtu.be URLs. */
export function parseYoutubeVideoId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[\w-]{11}$/.test(id) ? id : null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const watchId = url.searchParams.get("v");
  if (watchId && /^[\w-]{11}$/.test(watchId)) return watchId;

  if (parts.length >= 2 && (parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed")) {
    const id = parts[1] ?? "";
    return /^[\w-]{11}$/.test(id) ? id : null;
  }

  return null;
}

/** Extract a Twitter/X status id from status URLs. */
export function parseTwitterStatusId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (!TWITTER_HOSTS.has(host)) return null;

  const match = url.pathname.match(/\/status(?:es)?\/(\d+)/i);
  return match?.[1] ?? null;
}

export function classifyEmbedUrl(raw: string): EmbedProvider {
  if (parseYoutubeVideoId(raw)) return "youtube";
  if (parseTwitterStatusId(raw)) return "twitter";
  return "generic";
}

export function youtubeEmbedSrc(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`;
}
