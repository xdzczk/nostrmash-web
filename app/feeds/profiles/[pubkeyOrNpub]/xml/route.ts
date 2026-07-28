import { getAuthorEvents } from "@/lib/api/endpoints";
import { isValidPubkeyOrNpubParam, resolvePubkeyParam } from "@/lib/routing/params";
import { absoluteUrl } from "@/lib/seo/metadata";
import { buildRssXml, type RssItem } from "@/lib/seo/rss";

export const revalidate = 300;

type Params = Promise<{ pubkeyOrNpub: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { pubkeyOrNpub } = await params;
  if (!isValidPubkeyOrNpubParam(pubkeyOrNpub)) {
    return new Response("Invalid profile", { status: 400 });
  }
  const pubkey = resolvePubkeyParam(pubkeyOrNpub) ?? pubkeyOrNpub;

  try {
    const payload = await getAuthorEvents(pubkey, "shortTtl", { limit: 50 });
    const events = Array.isArray(payload.events) ? payload.events : [];
    const items: RssItem[] = [];
    for (const note of events) {
      const id =
        (typeof note.id === "string" && note.id) ||
        (typeof note.event_id === "string" && note.event_id) ||
        "";
      if (!id) continue;
      const content = typeof note.content === "string" ? note.content.trim() : "";
      items.push({
        title: content.slice(0, 80) || `Note ${id.slice(0, 12)}`,
        link: absoluteUrl(`/notes/${encodeURIComponent(id)}`),
        description: content.slice(0, 280) || "Author note",
        pubDate: typeof note.created_at === "number" ? new Date(note.created_at * 1000) : undefined,
      });
    }

    const xml = buildRssXml({
      title: `NostrMash profile ${pubkeyOrNpub.slice(0, 18)}`,
      link: absoluteUrl(`/profiles/${encodeURIComponent(pubkeyOrNpub)}`),
      description: "Recent notes from this Nostr profile.",
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
