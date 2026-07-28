import { getTrendingNotes } from "@/lib/api/endpoints";
import { absoluteUrl } from "@/lib/seo/metadata";
import { buildRssXml, type RssItem } from "@/lib/seo/rss";

export async function buildTrendingNotesFeedXml(window: "24h" | "7d" = "24h"): Promise<string> {
  const payload = await getTrendingNotes("shortTtl", { window, limit: 50 });
  const notes = Array.isArray(payload.notes) ? payload.notes : [];
  const items: RssItem[] = [];
  for (const note of notes) {
    const id =
      (typeof note.id === "string" && note.id) ||
      (typeof note.event_id === "string" && note.event_id) ||
      "";
    if (!id) continue;
    const content = typeof note.content === "string" ? note.content.trim() : "";
    const title =
      content.length > 0
        ? content.length > 80
          ? `${content.slice(0, 77)}…`
          : content
        : `Note ${id.slice(0, 12)}`;
    items.push({
      title,
      link: absoluteUrl(`/notes/${encodeURIComponent(id)}`),
      description: content.slice(0, 280) || "Nostr note",
      pubDate: typeof note.created_at === "number" ? new Date(note.created_at * 1000) : undefined,
      guid: absoluteUrl(`/notes/${encodeURIComponent(id)}`),
    });
  }

  return buildRssXml({
    title: `NostrMash trending notes (${window})`,
    link: absoluteUrl("/trending/notes"),
    description: "Trending Nostr notes indexed by NostrMash.",
    items,
  });
}
