/* eslint-disable @next/next/no-img-element */

type MediaKind = "image" | "video" | "audio";

interface MediaAttachment {
  url: string;
  kind: MediaKind;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);
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

function classifyMediaUrl(value: string): MediaKind | null {
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
          className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60"
        >
          {attachment.kind === "image" ? (
            <img src={attachment.url} alt="" className="max-h-[28rem] w-full object-cover" />
          ) : null}
          {attachment.kind === "video" ? (
            <video
              src={attachment.url}
              controls
              playsInline
              preload="metadata"
              className="max-h-[28rem] w-full bg-black"
            />
          ) : null}
          {attachment.kind === "audio" ? (
            <div className="p-3">
              <audio src={attachment.url} controls preload="metadata" className="w-full" />
            </div>
          ) : null}
          <div className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-200"
            >
              {attachment.url}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
