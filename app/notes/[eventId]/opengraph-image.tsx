import { ImageResponse } from "next/og";

import { getNoteSummaryCached } from "@/lib/notes/load-note-page-data";
import { isValidEventIdParam, resolveEventIdParam } from "@/lib/routing/params";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "linear-gradient(145deg, #0b1020 0%, #171f3d 60%, #24306a 100%)",
        color: "#f4f6ff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 24, letterSpacing: 3, opacity: 0.65 }}>NOSTRMASH · NOTE</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 48, fontWeight: 650, lineHeight: 1.15, maxHeight: 280 }}>
          {title}
        </div>
        <div style={{ fontSize: 28, opacity: 0.8 }}>{subtitle}</div>
      </div>
    </div>,
    { ...size }
  );
}
