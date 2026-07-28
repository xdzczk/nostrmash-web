import { getHashtagNotes } from "@/lib/api/endpoints";
import { absoluteUrl } from "@/lib/seo/metadata";
import { buildRssXml, type RssItem } from "@/lib/seo/rss";

export const revalidate = 300;

type Params = Promise<{ hashtag: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { hashtag } = await params;
  const tag = decodeURIComponent(hashtag).trim().replace(/^#/, "").toLowerCase();
  if (!tag) {
    return new Response("Invalid hashtag", { status: 400 });
  }

  try {
    const payload = await getHashtagNotes(tag, "shortTtl", { limit: 50, window: "24h" });
    const notes = Array.isArray(payload.notes) ? payload.notes : [];
    const items: RssItem[] = [];
    for (const note of notes) {
      const id =
        (typeof note.id === "string" && note.id) ||
        (typeof note.event_id === "string" && note.event_id) ||
        "";
      if (!id) continue;
      const content = typeof note.content === "string" ? note.content.trim() : "";
      items.push({
        title: content.slice(0, 80) || `#${tag} note`,
        link: absoluteUrl(`/notes/${encodeURIComponent(id)}`),
        description: content.slice(0, 280) || `Note tagged #${tag}`,
        pubDate: typeof note.created_at === "number" ? new Date(note.created_at * 1000) : undefined,
      });
    }

    const xml = buildRssXml({
      title: `NostrMash #${tag}`,
      link: absoluteUrl(`/hashtags/${encodeURIComponent(tag)}`),
      description: `Recent notes for #${tag}`,
      items,
    });

    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return new Response("Failed to build feed", { status: 502 });
  }
}
