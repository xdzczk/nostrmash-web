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
  getHotConversations,
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
} from "@/lib/api/profile-hydration";
import { presentConversations } from "@/lib/discover/conversation-order";
import { hydrateRankedMediaEvents } from "@/lib/discover/media-rankings";
import { DISCOVERY_30D_HIDDEN_COOKIE } from "@/lib/discover/discovery-window-session";
import { lastDiscoveryWindow } from "@/lib/discover/window-fallback";
import {
  isRankingSurface,
  parseRankedContinuation,
  rankedListRequest,
  rankedPageContinuation,
  rankingItemAnchor,
  type RankingSurface,
} from "@/lib/explorer/ranked-pagination";
import { parseLanguage } from "@/lib/search-params/language";
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
 * in place. Ranked endpoints page with `offset` (up to 5000), not a cursor.
 */
export async function loadMoreRanking(
  surface: string,
  window: string,
  lang: string,
  token: string
): Promise<LoadMoreChunk> {
  if (!isRankingSurface(surface)) return { content: null };
  if (!isStatsWindow(window)) return { content: null };
  const parsed = parseRankedContinuation(token);
  if (!parsed) return { content: null };
  const language = parseLanguage(lang);

  let loaded: Awaited<ReturnType<typeof loadSurface>>;
  try {
    loaded = await loadSurface(surface, rankedListRequest(window, language, parsed.offset));
  } catch (error) {
    const status = isApiError(error) ? error.status : null;
    if (!fallbackAfterRejected30d(window, "24h", status).hide30d) throw error;
    const jar = await cookies();
    jar.set(DISCOVERY_30D_HIDDEN_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    const previous = await lastDiscoveryWindow();
    loaded = await loadSurface(surface, rankedListRequest(previous, language, parsed.offset));
  }
  const first = rankingItemAnchor(surface, loaded.items[0]);
  if (loaded.items.length === 0 || !first || first === parsed.anchor) {
    return { content: null };
  }
  const continuation = rankedPageContinuation(surface, loaded.items, parsed.offset);

  return {
    content: await renderSurface(surface, loaded, parsed.offset),
    nextCursor: continuation.token,
  };
}

type RankedQuery = ReturnType<typeof rankedListRequest>;

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
    case "conversations": {
      const payload = await getHotConversations("shortTtl", query);
      const notes = payload.notes ?? [];
      return { items: notes, notes };
    }
    case "long-form": {
      const payload = await getTrendingLongForm("shortTtl", query);
      const notes = payload.articles ?? [];
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
    case "notes": {
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
    case "rising": {
      let profiles = loaded.profiles ?? [];
      if (profiles.length > 0) {
        try {
          profiles = await hydrateProfiles(profiles, "shortTtl");
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
