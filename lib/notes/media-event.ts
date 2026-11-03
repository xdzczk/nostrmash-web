import { encodeNaddr } from "@/lib/nostr/nip19";
import { parseYoutubeVideoId } from "@/lib/notes/embeds";
import {
  classifyNoteMediaUrl,
  type NoteMediaAttachment,
  type NoteMediaKind,
} from "@/lib/notes/media";
import {
  eventTagRows,
  firstTagValue,
  tagValues,
  type AddressCoordinate,
} from "@/lib/notes/event-tags";
import {
  isAddressableMediaKind,
  isMediaKind,
  isShortVideoKind,
  PICTURE_KIND,
} from "@/lib/notes/kinds";
import type { EventRecord } from "@/lib/types/api";

export type MediaImage = {
  url: string;
  alt?: string;
};

export type MediaPresentation = {
  variant: "picture" | "video" | "short";
  title?: string;
  /** Caption for pictures, description for videos. */
  text: string;
  durationLabel?: string;
  publishedAt?: number;
  images: MediaImage[];
  videoUrl?: string;
  posterUrl?: string;
  address?: AddressCoordinate;
  /** Bech32 naddr for addressable video (kind 34235 / 34236). */
  naddr?: string;
};

type ImetaFields = {
  urls: string[];
  images: string[];
  fallbacks: string[];
  mime?: string;
  alt?: string;
};

function httpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseImeta(parts: string[]): ImetaFields {
  const urls: string[] = [];
  const images: string[] = [];
  const fallbacks: string[] = [];
  let mime: string | undefined;
  let alt: string | undefined;
  for (let index = 1; index < parts.length; index += 1) {
    const part = parts[index]?.trim() ?? "";
    if (!part) continue;
    const direct = httpsUrl(part);
    if (direct && !part.includes(" ")) {
      urls.push(direct);
      continue;
    }
    const space = part.indexOf(" ");
    const key = (space === -1 ? part : part.slice(0, space)).toLowerCase();
    const rawValue = space === -1 ? "" : part.slice(space + 1).trim();
    const value = httpsUrl(rawValue) ?? (rawValue.length > 0 ? rawValue : undefined);
    if (!value) continue;
    if (key === "url") {
      const safe = httpsUrl(value);
      if (safe) urls.push(safe);
    } else if (key === "image") {
      const safe = httpsUrl(value);
      if (safe) images.push(safe);
    } else if (key === "fallback") {
      const safe = httpsUrl(value);
      if (safe) fallbacks.push(safe);
    } else if (key === "m" || key === "mime") {
      mime = value.toLowerCase();
    } else if (key === "alt") {
      alt = value;
    }
  }
  return { urls, images, fallbacks, mime, alt };
}

function attachmentKind(url: string, mime: string | undefined): NoteMediaKind | null {
  // The URL wins over `m`. Clients put the thumbnail mime (`image/jpeg`) on the
  // same imeta as a YouTube watch URL or a video file.
  if (parseYoutubeVideoId(url) || classifyNoteMediaUrl(url) === "video") return "video";
  if (mime?.startsWith("image/")) return "image";
  if (mime?.startsWith("video/")) return "video";
  if (mime?.startsWith("audio/")) return "audio";
  return classifyNoteMediaUrl(url);
}

/** NIP-92 imeta files. A poster image is not a second attachment when a video is present. */
export function extractImetaAttachments(tags: unknown): NoteMediaAttachment[] {
  const seen = new Set<string>();
  const attachments: NoteMediaAttachment[] = [];
  const add = (url: string, kind: NoteMediaKind, alt?: string) => {
    if (seen.has(url)) return;
    seen.add(url);
    attachments.push(alt ? { url, kind, alt } : { url, kind });
  };

  for (const row of eventTagRows(tags)) {
    if ((row[0] ?? "").toLowerCase() !== "imeta") continue;
    const imeta = parseImeta(row);
    const pool = imeta.urls.length > 0 ? imeta.urls : imeta.fallbacks;
    const video = pool.find((url) => attachmentKind(url, imeta.mime) === "video");
    if (video) {
      add(video, "video", imeta.alt);
      continue;
    }
    for (const url of imeta.images) add(url, "image", imeta.alt);
    for (const url of pool) {
      const kind = attachmentKind(url, imeta.mime);
      if (kind === "image" || kind === "audio") add(url, kind, imeta.alt);
    }
  }

  return attachments;
}

function looksLikeVideo(url: string, mime: string | undefined): boolean {
  if (parseYoutubeVideoId(url) || classifyNoteMediaUrl(url) === "video") return true;
  if (mime?.startsWith("image/") || mime?.startsWith("audio/")) return false;
  if (mime?.startsWith("video/")) return true;
  return false;
}

function looksLikeImage(url: string, mime: string | undefined): boolean {
  if (parseYoutubeVideoId(url) || classifyNoteMediaUrl(url) === "video") return false;
  if (mime?.startsWith("video/") || mime?.startsWith("audio/")) return false;
  if (mime?.startsWith("image/")) return true;
  return classifyNoteMediaUrl(url) === "image";
}

export function formatMediaDuration(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes(":")) return trimmed;
  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds) || seconds < 0) return trimmed;
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remain = total % 60;
  const clock = `${minutes}:${String(remain).padStart(2, "0")}`;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`
    : clock;
}

function publishedAt(tags: unknown): number | undefined {
  const raw = firstTagValue(tags, "published_at");
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function getMediaPresentation(
  event: EventRecord | null | undefined
): MediaPresentation | null {
  if (!event || typeof event.kind !== "number" || !isMediaKind(event.kind)) return null;
  const kind = event.kind;

  const tags = event.tags;
  const imetas = eventTagRows(tags)
    .filter((tag) => (tag[0] ?? "").toLowerCase() === "imeta")
    .map(parseImeta);
  const plainUrls = tagValues(tags, "url")
    .map((value) => httpsUrl(value))
    .filter((value): value is string => Boolean(value));

  const images: MediaImage[] = [];
  const seenImages = new Set<string>();
  const addImage = (url: string | null | undefined, alt?: string) => {
    if (!url || seenImages.has(url)) return;
    seenImages.add(url);
    images.push(alt ? { url, alt } : { url });
  };

  let videoUrl: string | undefined;
  let posterUrl: string | undefined;
  const isPicture = kind === PICTURE_KIND;

  for (const imeta of imetas) {
    const candidates = [...imeta.urls, ...imeta.fallbacks];
    for (const url of candidates) {
      if (isPicture) {
        if (!looksLikeVideo(url, imeta.mime)) addImage(url, imeta.alt);
        continue;
      }
      if (!videoUrl && (looksLikeVideo(url, imeta.mime) || !looksLikeImage(url, imeta.mime))) {
        videoUrl = url;
      } else if (looksLikeImage(url, imeta.mime)) {
        addImage(url, imeta.alt);
        posterUrl ??= url;
      }
    }
    for (const image of imeta.images) {
      addImage(image, imeta.alt);
      posterUrl ??= image;
    }
  }

  for (const url of plainUrls) {
    if (isPicture) {
      addImage(url);
      continue;
    }
    if (!videoUrl && !looksLikeImage(url, undefined)) videoUrl = url;
    else if (looksLikeImage(url, undefined)) {
      addImage(url);
      posterUrl ??= url;
    }
  }

  const title = firstTagValue(tags, "title")?.trim();
  const text = typeof event.content === "string" ? event.content.trim() : "";
  const identifier = firstTagValue(tags, "d")?.trim();
  const pubkey = typeof event.pubkey === "string" ? event.pubkey.trim().toLowerCase() : "";
  const coordinate: AddressCoordinate | undefined =
    isAddressableMediaKind(kind) && identifier && /^[0-9a-f]{64}$/.test(pubkey)
      ? { kind, pubkey, identifier }
      : undefined;
  const naddr = coordinate
    ? (encodeNaddr({
        identifier: coordinate.identifier,
        pubkey: coordinate.pubkey,
        kind: coordinate.kind,
      }) ?? undefined)
    : undefined;

  const variant = isShortVideoKind(kind) ? "short" : kind === PICTURE_KIND ? "picture" : "video";

  return {
    variant,
    title: title && title.length > 0 ? title : undefined,
    text,
    durationLabel: formatMediaDuration(firstTagValue(tags, "duration")),
    publishedAt: publishedAt(tags),
    images,
    videoUrl,
    posterUrl,
    address: coordinate,
    naddr,
  };
}

export function addressableMediaNaddr(event: EventRecord | null | undefined): string | null {
  return getMediaPresentation(event)?.naddr ?? null;
}
