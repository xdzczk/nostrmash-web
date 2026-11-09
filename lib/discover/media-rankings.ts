import { getTrendingMedia } from "@/lib/api/endpoints";
import { fetchEventsById } from "@/lib/api/profile-hydration";
import {
  eventIdOf,
  isMediaKind,
  PICTURE_KIND,
  SHORT_VIDEO_KIND,
  VIDEO_KIND,
} from "@/lib/notes/kinds";
import type { EventRecord } from "@/lib/types/api";

export const MEDIA_RANKINGS = [
  {
    format: "pictures",
    label: "Pictures",
    path: "/trending/pictures",
    title: "Pictures",
    subtitle: "The pictures leading the network.",
    description: "Explore the pictures leading the network.",
    emptyTitle: "No ranked pictures yet",
    emptyMessage: "Ranked pictures have not populated for this window.",
    continuationLabel: "Load more pictures",
    fallbackKind: PICTURE_KIND,
  },
  {
    format: "videos",
    label: "Videos",
    path: "/trending/videos",
    title: "Videos",
    subtitle: "The videos leading the network.",
    description: "Explore the videos leading the network.",
    emptyTitle: "No ranked videos yet",
    emptyMessage: "Ranked videos have not populated for this window.",
    continuationLabel: "Load more videos",
    fallbackKind: VIDEO_KIND,
  },
  {
    format: "shorts",
    label: "Shorts",
    path: "/trending/shorts",
    title: "Shorts",
    subtitle: "The short videos leading the network.",
    description: "Explore the short videos leading the network.",
    emptyTitle: "No ranked shorts yet",
    emptyMessage: "Ranked short videos have not populated for this window.",
    continuationLabel: "Load more shorts",
    fallbackKind: SHORT_VIDEO_KIND,
  },
] as const;

export type MediaRankingFormat = (typeof MEDIA_RANKINGS)[number]["format"];

export type MediaLeaders = Partial<Record<MediaRankingFormat, EventRecord>>;

export function mediaRanking(format: MediaRankingFormat) {
  const ranking = MEDIA_RANKINGS.find((item) => item.format === format);
  if (!ranking) {
    throw new Error(`Unknown media ranking: ${format}`);
  }
  return ranking;
}

function mediaKind(event: EventRecord | undefined, fallbackKind: number): number {
  if (typeof event?.kind === "number" && isMediaKind(event.kind)) return event.kind;
  return fallbackKind;
}

/** Keep the ranking row, and prefer the stored event for tags and the real kind. */
export function mergeRankedMediaEvent(
  ranked: EventRecord,
  hydrated: EventRecord | undefined,
  format: MediaRankingFormat
): EventRecord {
  const fallbackKind = mediaRanking(format).fallbackKind;
  const id = eventIdOf(hydrated ?? ranked) ?? eventIdOf(ranked);
  return {
    ...ranked,
    ...(hydrated ?? {}),
    ...(id ? { id } : {}),
    kind: mediaKind(hydrated, mediaKind(ranked, fallbackKind)),
    tags: hydrated?.tags ?? ranked.tags,
    content: typeof hydrated?.content === "string" ? hydrated.content : ranked.content,
    ranking: ranked.ranking ?? hydrated?.ranking,
    score: ranked.score ?? hydrated?.score,
    reply_count: ranked.reply_count ?? hydrated?.reply_count,
    repost_count: ranked.repost_count ?? hydrated?.repost_count,
    reaction_count: ranked.reaction_count ?? hydrated?.reaction_count,
    zap_count: ranked.zap_count ?? hydrated?.zap_count,
    zap_msats: ranked.zap_msats ?? hydrated?.zap_msats,
  };
}

export async function hydrateRankedMediaEvents(
  events: EventRecord[],
  format: MediaRankingFormat
): Promise<EventRecord[]> {
  if (events.length === 0) return [];
  const full = await fetchEventsById(events.map((event) => eventIdOf(event)));
  return events.map((ranked) => {
    const id = eventIdOf(ranked)?.toLowerCase();
    return mergeRankedMediaEvent(ranked, id ? full[id] : undefined, format);
  });
}

/** One leader per format. A missing route or a failed ranking leaves that column out. */
export async function loadHomeMediaLeaders(query: {
  window: string;
  lang?: string;
}): Promise<MediaLeaders> {
  const leaders = await Promise.all(
    MEDIA_RANKINGS.map(async (ranking) => {
      try {
        const payload = await getTrendingMedia(ranking.format, "shortTtl", {
          window: query.window,
          limit: 1,
          offset: 0,
          ...(query.lang ? { lang: query.lang } : {}),
        });
        const [event] = await hydrateRankedMediaEvents(
          (payload.events ?? []).slice(0, 1),
          ranking.format
        );
        return [ranking.format, event] as const;
      } catch {
        return [ranking.format, undefined] as const;
      }
    })
  );
  const result: MediaLeaders = {};
  for (const [format, event] of leaders) {
    if (event) result[format] = event;
  }
  return result;
}
