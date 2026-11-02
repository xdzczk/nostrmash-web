import { parseYoutubeVideoId } from "@/lib/notes/embeds";

export type LiveSession = {
  key: string;
  title: string;
  streaming: string;
  href?: string;
  image?: string;
  authorLabel?: string;
};

export type StreamSource =
  | { kind: "hls"; url: string }
  | { kind: "file"; url: string; media: "audio" | "video" }
  | { kind: "youtube"; videoId: string; url: string }
  | { kind: "external"; url: string };

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|flac|oga|opus)$/i;
const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)$/i;

const KIND_RANK: Record<StreamSource["kind"], number> = {
  hls: 0,
  file: 1,
  youtube: 2,
  external: 3,
};

function youtubeVideoId(url: URL): string | null {
  const parsed = parseYoutubeVideoId(url.toString());
  if (parsed) return parsed;
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "www.youtube-nocookie.com") {
    return null;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "embed") return null;
  const id = parts[1] ?? "";
  return /^[\w-]{11}$/.test(id) ? id : null;
}

/** How a NIP-53 `streaming` URL can be played inside the site. */
export function classifyStreamUrl(raw: string): StreamSource {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { kind: "external", url: raw };
  }
  if (url.protocol !== "https:") return { kind: "external", url: raw };

  const videoId = youtubeVideoId(url);
  if (videoId) return { kind: "youtube", videoId, url: url.toString() };

  const path = decodeURIComponent(url.pathname).toLowerCase();
  const href = url.toString();
  if (
    path.endsWith(".m3u8") ||
    path.includes("/hls/") ||
    url.searchParams.get("format") === "m3u8"
  ) {
    return { kind: "hls", url: href };
  }
  if (AUDIO_EXT.test(path)) return { kind: "file", url: href, media: "audio" };
  if (VIDEO_EXT.test(path)) return { kind: "file", url: href, media: "video" };
  return { kind: "external", url: href };
}

/**
 * Pick the streaming URL a browser can actually play.
 * NIP-53 allows several `streaming` tags (HLS, MOQ, page links). MOQ and
 * plain http are ignored. HLS wins over a file, a file over YouTube.
 */
export function preferPlayableStream(values: string[]): string | undefined {
  let best: { url: string; rank: number } | undefined;
  for (const value of values) {
    const source = classifyStreamUrl(value);
    if (!source.url.startsWith("https:")) continue;
    const rank = KIND_RANK[source.kind];
    if (!best || rank < best.rank) best = { url: source.url, rank };
  }
  return best?.url;
}
