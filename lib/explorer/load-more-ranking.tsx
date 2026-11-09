"use server";

import { cookies } from "next/headers";

import type { LoadMoreChunk } from "@/components/data/load-more-list";
import {
  ArticlesList,
  DomainsList,
  HashtagsList,
  NotesList,
  ProfilesList,
} from "@/components/data/renderers";
import {
  getBookmarkedNotes,
  getHotConversations,
  getMostFollowedProfiles,
  getMostSupportedProfiles,
  getMostZappedNotes,
  getRisingProfiles,
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingLongForm,
  getTrendingMedia,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import {
  extractEventAuthorPubkeys,
  fetchProfilesByPubkey,
  hydrateProfiles,
  restoreRankingMetrics,
} from "@/lib/api/profile-hydration";
import { presentConversations } from "@/lib/discover/conversation-order";
import { hydrateArticleRecords } from "@/lib/discover/hydrate-articles";
import { hydrateRankedMediaEvents } from "@/lib/discover/media-rankings";
import { DISCOVERY_30D_HIDDEN_COOKIE } from "@/lib/discover/discovery-window-session";
import { lastDiscoveryWindow } from "@/lib/discover/window-fallback";
import {
  isRankingSurface,
  parseRankedContinuation,
  rankedPageContinuation,
  rankingContinuationQuery,
  rankingItemAnchor,
  type RankingSurface,
} from "@/lib/explorer/ranked-pagination";
import { fallbackAfterRejected30d, isStatsWindow } from "@/lib/search-params/window";
import type { DomainEntry, EventRecord, HashtagEntry, Profile } from "@/lib/types/api";

async function authorMap(events: EventRecord[]): Promise<Record<string, Profile>> {
  if (events.length === 0) return {};
  try {
    return await fetchProfilesByPubkey(extractEventAuthorPubkeys(events), "shortTtl");
  } catch {
    return {};
  }
}

/**
 * Next page of a ranked discovery list, rendered on the server and appended
 * in place. Ranked endpoints page with `offset` (up to 5000, or 500 with a
 * viewer), not a cursor.
 */
export async function loadMoreRanking(
  surface: string,
  window: string,
  lang: string,
  viewer: string,
  token: string
): Promise<LoadMoreChunk> {
  if (!isRankingSurface(surface)) return { content: null };
  const parsed = parseRankedContinuation(token);
  if (!parsed) return { content: null };
  const query = rankingContinuationQuery(surface, window, lang, parsed.offset, viewer);
  if (!query) return { content: null };
  const windowless = surface === "bookmarked" || surface === "followed";

  let loaded: Awaited<ReturnType<typeof loadSurface>>;
  try {
    loaded = await loadSurface(surface, query);
  } catch (error) {
    if (windowless || !isStatsWindow(window)) throw error;
    const status = isApiError(error) ? error.status : null;
    if (!fallbackAfterRejected30d(window, "24h", status).hide30d) throw error;
    const jar = await cookies();
    jar.set(DISCOVERY_30D_HIDDEN_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    const previous = await lastDiscoveryWindow();
    const retry = rankingContinuationQuery(surface, previous, lang, parsed.offset, viewer);
    if (!retry) throw error;
    loaded = await loadSurface(surface, retry);
  }
  const first = rankingItemAnchor(surface, loaded.items[0]);
  if (loaded.items.length === 0 || !first || first === parsed.anchor) {
    return { content: null };
  }
  const continuation = rankedPageContinuation(
    surface,
    loaded.items,
    parsed.offset,
    undefined,
    viewer
  );

  return {
    content: await renderSurface(surface, loaded, parsed.offset),
    nextCursor: continuation.token,
  };
}

type RankedQuery = NonNullable<ReturnType<typeof rankingContinuationQuery>>;

async function loadSurface(
  surface: RankingSurface,
  query: RankedQuery
): Promise<{
  items: unknown[];
  notes?: EventRecord[];
  profiles?: Profile[];
  hashtags?: Array<string | HashtagEntry>;
  domains?: Array<string | DomainEntry>;
}> {
  switch (surface) {
    case "notes": {
      const payload = await getTrendingNotes("shortTtl", query);
      const notes = payload.notes ?? [];
      return { items: notes, notes };
    }
    case "bookmarked": {
      const payload = await getBookmarkedNotes("shortTtl", query);
      const notes = payload.notes ?? [];
      return { items: notes, notes };
    }
    case "zapped": {
      const payload = await getMostZappedNotes("shortTtl", query);
      const notes = payload.notes ?? [];
      return { items: notes, notes };
    }
    case "conversations": {
      const payload = await getHotConversations("shortTtl", query);
      const notes = payload.notes ?? [];
      return { items: notes, notes };
    }
    case "long-form": {
      const payload = await getTrendingLongForm("shortTtl", query);
      const notes = await hydrateArticleRecords(payload.articles ?? []);
      return { items: notes, notes };
    }
    case "pictures":
    case "videos":
    case "shorts": {
      const payload = await getTrendingMedia(surface, "shortTtl", query);
      const notes = await hydrateRankedMediaEvents(payload.events ?? [], surface);
      return { items: notes, notes };
    }
    case "profiles": {
      const payload = await getTrendingProfiles("shortTtl", query);
      const profiles = payload.profiles ?? [];
      return { items: profiles, profiles };
    }
    case "rising": {
      const payload = await getRisingProfiles("shortTtl", query);
      const profiles = payload.profiles ?? [];
      return { items: profiles, profiles };
    }
    case "followed": {
      const payload = await getMostFollowedProfiles("shortTtl", query);
      const profiles = payload.profiles ?? [];
      return { items: profiles, profiles };
    }
    case "supported": {
      const payload = await getMostSupportedProfiles("shortTtl", query);
      const profiles = payload.profiles ?? [];
      return { items: profiles, profiles };
    }
    case "hashtags": {
      const payload = await getTrendingHashtags("shortTtl", query);
      const hashtags = payload.hashtags ?? [];
      return { items: hashtags, hashtags };
    }
    case "domains": {
      const payload = await getTrendingDomains("shortTtl", query);
      const domains = payload.domains ?? [];
      return { items: domains, domains };
    }
  }
}

async function renderSurface(
  surface: RankingSurface,
  loaded: {
    notes?: EventRecord[];
    profiles?: Profile[];
    hashtags?: Array<string | HashtagEntry>;
    domains?: Array<string | DomainEntry>;
  },
  offset: number
) {
  switch (surface) {
    case "notes":
    case "bookmarked":
    case "zapped": {
      const notes = loaded.notes ?? [];
      return (
        <NotesList
          notes={notes}
          authorsByPubkey={await authorMap(notes)}
          ranked
          discoverySignals
          rankOffset={offset}
        />
      );
    }
    case "conversations": {
      const notes = presentConversations(loaded.notes ?? []);
      return (
        <NotesList
          notes={notes}
          authorsByPubkey={await authorMap(notes)}
          ranked
          conversation
          rankOffset={offset}
        />
      );
    }
    case "long-form": {
      const articles = loaded.notes ?? [];
      return (
        <ArticlesList
          articles={articles}
          authorsByPubkey={await authorMap(articles)}
          ranked
          showUtilityLinks={false}
          rankOffset={offset}
        />
      );
    }
    case "pictures":
    case "videos":
    case "shorts": {
      const notes = loaded.notes ?? [];
      return (
        <NotesList
          notes={notes}
          authorsByPubkey={await authorMap(notes)}
          ranked
          discoverySignals
          showUtilityLinks={false}
          rankOffset={offset}
        />
      );
    }
    case "profiles":
    case "rising":
    case "followed":
    case "supported": {
      let profiles = loaded.profiles ?? [];
      if (profiles.length > 0) {
        try {
          const hydrated = await hydrateProfiles(profiles, "shortTtl");
          profiles =
            surface === "followed" || surface === "supported"
              ? hydrated.map((profile, index) =>
                  restoreRankingMetrics(loaded.profiles?.[index] ?? profile, profile)
                )
              : hydrated;
        } catch {
          // Keep the ranking rows when identity lookup fails.
        }
      }
      return <ProfilesList profiles={profiles} ranked discoverySignals rankOffset={offset} />;
    }
    case "hashtags":
      return (
        <HashtagsList
          hashtags={loaded.hashtags ?? []}
          ranked
          searchable
          continued
          rankOffset={offset}
        />
      );
    case "domains":
      return (
        <DomainsList
          domains={loaded.domains ?? []}
          ranked
          searchable
          continued
          rankOffset={offset}
        />
      );
  }
}
