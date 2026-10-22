import { NoteMediaReveal } from "@/components/explorer/note-media-reveal";
import { extractNoteMediaAttachments } from "@/lib/notes/media";

/**
 * - `full`: every attachment at natural ratio, capped so a tall image can still be enlarged.
 * - `detail`: the focal note. Same as full, but short enough that the sentence starts on screen.
 * - `thread`: a reply. At most two attachments, each at conversation height.
 * - `lead`: max two attachments side by side in fixed boxes (homepage lead;
 *   no CLS, and the card never grows by more than one image's height).
 * - `compact`: one attachment with a `+N` badge, always a square thumbnail.
 */
export type NoteMediaVariant = "full" | "lead" | "compact" | "detail" | "thread";

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

  const defaultLimit =
    variant === "compact" ? 1 : variant === "lead" || variant === "thread" ? 2 : attachments.length;
  const limit = maxAttachments ?? defaultLimit;
  const visible = attachments.slice(0, Math.max(1, limit));
  const hidden = attachments.length - visible.length;

  const wrapperClassName =
    variant === "compact"
      ? "w-[5.5rem]"
      : variant === "lead"
        ? // Two lead images share a row instead of stacking.
          `mt-4 grid gap-3 ${visible.length > 1 ? "grid-cols-2" : "grid-cols-1"}`
        : variant === "thread"
          ? // Reply images stay in the conversation: at most two, side by side.
            `mt-2 grid gap-2 ${visible.length > 1 ? "grid-cols-2" : "grid-cols-1"}`
          : "mt-3 space-y-3";

  return (
    <div className={wrapperClassName}>
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
