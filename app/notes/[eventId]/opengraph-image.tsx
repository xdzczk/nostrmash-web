import { getNoteSummaryCached } from "@/lib/notes/load-note-page-data";
import { createOgImage, ogContentType, ogSize } from "@/lib/og/template";
import { isValidEventIdParam, resolveEventIdParam } from "@/lib/routing/params";

export const runtime = "nodejs";
export const size = ogSize;
export const contentType = ogContentType;

type Params = Promise<{ eventId: string }>;

export default async function NoteOpenGraphImage({ params }: { params: Params }) {
  const { eventId } = await params;
  let title = "Nostr note";
  let subtitle = "Viewed on NostrMash";
  let author = "";

  if (isValidEventIdParam(eventId)) {
    const resolvedId = resolveEventIdParam(eventId) ?? eventId;
    try {
      const payload = await getNoteSummaryCached(resolvedId);
      const content = typeof payload.note?.content === "string" ? payload.note.content.trim() : "";
      title = content.length > 0 ? content.slice(0, 160) : `Note ${resolvedId.slice(0, 16)}`;
      const profile = payload.author?.profile as Record<string, unknown> | undefined;
      author =
        (typeof profile?.display_name === "string" && profile.display_name) ||
        (typeof profile?.name === "string" && profile.name) ||
        (typeof payload.note?.pubkey === "string" ? payload.note.pubkey.slice(0, 16) : "");
      subtitle = author ? `by ${author}` : subtitle;
    } catch {
      // fall back to defaults
    }
  }

  return createOgImage({
    eyebrow: "NOSTRMASH · NOTE",
    title,
    subtitle,
    variant: "note",
    titleSize: 48,
  });
}
