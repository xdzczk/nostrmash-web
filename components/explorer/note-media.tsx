import { NoteMediaReveal } from "@/components/explorer/note-media-reveal";
import { extractNoteMediaAttachments } from "@/lib/notes/media";

/**
 * - `full`: every attachment at natural ratio (list and detail cards).
 * - `lead`: fixed 16:9 boxes, max two attachments (homepage lead; no CLS).
 * - `compact`: one fixed 16:10 thumbnail with a `+N` badge (sidebar/list).
 */
export type NoteMediaVariant = "full" | "lead" | "compact";

export function NoteMedia({
  content,
  variant = "full",
  maxAttachments,
  priority = false,
}: {
  content: string;
  variant?: NoteMediaVariant;
  /** Cap on rendered attachments; defaults to 1 (`compact`), 2 (`lead`), unlimited (`full`). */
  maxAttachments?: number;
  /** Eager-load the first image (LCP candidate). */
  priority?: boolean;
}) {
  const attachments = extractNoteMediaAttachments(content);

  if (attachments.length === 0) {
    return null;
  }

  const defaultLimit = variant === "compact" ? 1 : variant === "lead" ? 2 : attachments.length;
  const limit = maxAttachments ?? defaultLimit;
  const visible = attachments.slice(0, Math.max(1, limit));
  const hidden = attachments.length - visible.length;

  return (
    <div className={variant === "compact" ? "mt-3" : "mt-3 space-y-3"}>
      {visible.map((attachment, index) => (
        <NoteMediaReveal
          key={attachment.url}
          url={attachment.url}
          kind={attachment.kind}
          variant={variant}
          priority={priority && index === 0}
          hiddenCount={index === visible.length - 1 ? hidden : 0}
        />
      ))}
    </div>
  );
}
