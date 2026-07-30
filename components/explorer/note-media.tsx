import { formatUrlForDisplay } from "@/components/explorer/utils";
import { NoteMediaReveal } from "@/components/explorer/note-media-reveal";

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
        <NoteMediaReveal
          key={attachment.url}
          url={attachment.url}
          kind={attachment.kind}
          displayUrl={formatUrlForDisplay(attachment.url, "secondary")}
        />
      ))}
    </div>
  );
}
