/* eslint-disable @next/next/no-img-element */

import { formatUrlForDisplay } from "@/components/explorer/utils";

type MediaKind = "image" | "video" | "audio";

interface MediaAttachment {
  url: string;
  kind: MediaKind;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);

function normalizeCandidateUrl(value: string): string {
  return value.replace(/[),.;!?]+$/g, "");
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/\S+/g) ?? [];
  const deduped = new Set<string>();

  for (const match of matches) {
    const normalized = normalizeCandidateUrl(match);
    if (normalized.length > 0) {
      deduped.add(normalized);
    }
  }

  return Array.from(deduped);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function classifyMediaUrl(value: string): MediaKind | null {
  if (!isHttpsUrl(value)) return null;

  try {
    const url = new URL(value);
    const pathname = url.pathname.toLowerCase();

    for (const extension of IMAGE_EXTENSIONS) {
      if (pathname.endsWith(extension)) return "image";
    }
    for (const extension of VIDEO_EXTENSIONS) {
      if (pathname.endsWith(extension)) return "video";
    }
    for (const extension of AUDIO_EXTENSIONS) {
      if (pathname.endsWith(extension)) return "audio";
    }
  } catch {
    return null;
  }

  return null;
}

function extractMediaAttachments(text: string): MediaAttachment[] {
  return extractUrls(text)
    .map((url) => {
      const kind = classifyMediaUrl(url);
      return kind ? { url, kind } : null;
    })
    .filter((entry): entry is MediaAttachment => entry !== null)
    .slice(0, 4);
}

export function NoteMedia({ content }: { content: string }) {
  const attachments = extractMediaAttachments(content);

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.url}
          className="border-edge bg-surface-sunken/60 overflow-hidden rounded-lg border"
        >
          {attachment.kind === "image" ? (
            <img
              src={attachment.url}
              alt="Image attached to note"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="max-h-[28rem] w-full object-cover"
            />
          ) : null}
          {attachment.kind === "video" ? (
            <details className="group">
              <summary className="text-ink-dim hover:text-ink cursor-pointer list-none px-3 py-3 text-sm">
                <span className="underline-offset-2 group-open:hidden">Load video</span>
                <span className="hidden underline-offset-2 group-open:inline">Hide video</span>
              </summary>
              <video
                src={attachment.url}
                controls
                playsInline
                preload="none"
                className="max-h-[28rem] w-full bg-black"
              />
            </details>
          ) : null}
          {attachment.kind === "audio" ? (
            <details className="group">
              <summary className="text-ink-dim hover:text-ink cursor-pointer list-none px-3 py-3 text-sm">
                <span className="underline-offset-2 group-open:hidden">Load audio</span>
                <span className="hidden underline-offset-2 group-open:inline">Hide audio</span>
              </summary>
              <div className="px-3 pb-3">
                <audio src={attachment.url} controls preload="none" className="w-full" />
              </div>
            </details>
          ) : null}
          <div className="border-edge text-ink-muted border-t px-3 py-2 text-xs">
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer noopener"
              title={attachment.url}
              referrerPolicy="no-referrer"
              className="hover:text-ink-soft"
            >
              {formatUrlForDisplay(attachment.url, "secondary")}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
