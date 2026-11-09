import { fetchEventsById } from "@/lib/api/profile-hydration";
import { eventIdOf } from "@/lib/notes/kinds";
import type { EventRecord } from "@/lib/types/api";

/**
 * Keep the ranking row, and take tags, title, and body from the stored event.
 * Trending long-form lists omit NIP-23 tags, so the title tag only exists on
 * the full event.
 */
export function mergeRankedArticle(ranked: EventRecord, hydrated?: EventRecord): EventRecord {
  if (!hydrated) return ranked;
  const tags =
    Array.isArray(hydrated.tags) && hydrated.tags.length > 0 ? hydrated.tags : ranked.tags;
  const content =
    typeof hydrated.content === "string" && hydrated.content.length > 0
      ? hydrated.content
      : ranked.content;
  return {
    ...ranked,
    ...hydrated,
    id: ranked.id || hydrated.id,
    pubkey: ranked.pubkey ?? hydrated.pubkey,
    kind: typeof hydrated.kind === "number" ? hydrated.kind : ranked.kind,
    tags,
    content,
    ranking: ranked.ranking ?? hydrated.ranking,
    score: ranked.score ?? hydrated.score,
    reply_count: ranked.reply_count ?? hydrated.reply_count,
    repost_count: ranked.repost_count ?? hydrated.repost_count,
    reaction_count: ranked.reaction_count ?? hydrated.reaction_count,
    zap_count: ranked.zap_count ?? hydrated.zap_count,
    zap_msats: ranked.zap_msats ?? hydrated.zap_msats,
  };
}

export async function hydrateArticleRecords(articles: EventRecord[]): Promise<EventRecord[]> {
  if (articles.length === 0) return [];
  const full = await fetchEventsById(articles.map((article) => eventIdOf(article)));
  return articles.map((ranked) => {
    const id = eventIdOf(ranked)?.toLowerCase();
    return mergeRankedArticle(ranked, id ? full[id] : undefined);
  });
}
