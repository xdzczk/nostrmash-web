import {
  getEmergingDomains,
  getEmergingHashtags,
  getHotConversations,
  getLiveActivities,
  getMostZappedNotes,
  getTrendingLongForm,
} from "@/lib/api/endpoints";
import { hydrateArticleRecords } from "@/lib/discover/hydrate-articles";
import type { EventRecord } from "@/lib/types/api";

export type HomeMover = {
  key: string;
  href: string;
  label: string;
  score: number;
};

/** Rankings that sit beside the home bundle: one article, conversations, zaps, live, movers. */
export type HomeRails = {
  article?: EventRecord;
  conversations: EventRecord[];
  zapped: EventRecord[];
  live: EventRecord[];
  movers: HomeMover[];
};

export const EMPTY_HOME_RAILS: HomeRails = {
  conversations: [],
  zapped: [],
  live: [],
  movers: [],
};

async function settled<T>(task: Promise<T>, fallback: T): Promise<T> {
  try {
    return await task;
  } catch {
    return fallback;
  }
}

function mixMovers(
  hashtags: Array<{ hashtag?: string; z_score_7d?: number }> | undefined,
  domains: Array<{ domain?: string; z_score_7d?: number }> | undefined,
  limit: number
): HomeMover[] {
  const rows: HomeMover[] = [];
  for (const item of hashtags ?? []) {
    const tag = item.hashtag?.replace(/^#/, "").trim();
    if (!tag || typeof item.z_score_7d !== "number") continue;
    rows.push({
      key: `tag:${tag.toLowerCase()}`,
      href: `/hashtags/${encodeURIComponent(tag)}`,
      label: `#${tag}`,
      score: item.z_score_7d,
    });
  }
  for (const item of domains ?? []) {
    const domain = item.domain?.trim().toLowerCase();
    if (!domain || typeof item.z_score_7d !== "number") continue;
    rows.push({
      key: `domain:${domain}`,
      href: `/domains/${encodeURIComponent(domain)}`,
      label: domain,
      score: item.z_score_7d,
    });
  }
  return rows.sort((left, right) => right.score - left.score).slice(0, limit);
}

/**
 * Extra homepage rankings. Each call fails closed so one quiet route cannot
 * blank the overview. Fetches a few spare rows so the page can skip a note
 * that is already the lead.
 */
export async function loadHomeRails(query: { window: string; lang?: string }): Promise<HomeRails> {
  const lang = query.lang ? { lang: query.lang } : {};
  const [articles, conversations, zapped, live, hashtags, domains] = await Promise.all([
    settled(
      getTrendingLongForm("shortTtl", { window: query.window, limit: 1, offset: 0, ...lang }).then(
        (payload) => hydrateArticleRecords((payload.articles ?? []).slice(0, 1))
      ),
      [] as EventRecord[]
    ),
    settled(
      getHotConversations("shortTtl", { window: query.window, limit: 6, ...lang }).then((payload) =>
        (payload.notes ?? []).slice(0, 6)
      ),
      [] as EventRecord[]
    ),
    settled(
      getMostZappedNotes("shortTtl", { window: query.window, limit: 5, offset: 0, ...lang }).then(
        (payload) => (payload.notes ?? []).slice(0, 5)
      ),
      [] as EventRecord[]
    ),
    settled(
      getLiveActivities("live", "shortTtl", { limit: 2 }).then((payload) =>
        (payload.events ?? []).slice(0, 2)
      ),
      [] as EventRecord[]
    ),
    settled(getEmergingHashtags(), { items: [] }),
    settled(getEmergingDomains(), { items: [] }),
  ]);

  return {
    article: articles[0],
    conversations,
    zapped,
    live,
    movers: mixMovers(hashtags.items, domains.items, 6),
  };
}
