import { buildTrendingNotesFeedXml } from "@/lib/feeds/build-trending-notes-feed";

export const revalidate = 300;

export async function GET() {
  try {
    const xml = await buildTrendingNotesFeedXml("24h");
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
