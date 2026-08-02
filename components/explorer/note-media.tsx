import { NoteMediaReveal } from "@/components/explorer/note-media-reveal";
import { extractNoteMediaAttachments } from "@/lib/notes/media";

export function NoteMedia({ content }: { content: string }) {
  const attachments = extractNoteMediaAttachments(content);

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {attachments.map((attachment) => (
        <NoteMediaReveal key={attachment.url} url={attachment.url} kind={attachment.kind} />
      ))}
    </div>
  );
}
