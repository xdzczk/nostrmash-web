import type { Metadata } from "next";

import { NotesList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getTrendingMedia } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import {
  hydrateRankedMediaEvents,
  mediaRanking,
  type MediaRankingFormat,
} from "@/lib/discover/media-rankings";
import { loadMoreRanking } from "@/lib/explorer/load-more-ranking";
import {
  rankedListRequest,
  rankedPageContinuation,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import { eventPageHref } from "@/lib/notes/kinds";
import { readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { withLanguageVariantMetadata } from "@/lib/seo/metadata";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function mediaRankingMetadata(
  format: MediaRankingFormat,
  searchParams: SearchParams
): Promise<Metadata> {
  const ranking = mediaRanking(format);
  return withLanguageVariantMetadata(
    {
      title: ranking.title,
      description: ranking.description,
    },
    readLanguage(await searchParams),
    ranking.path
  );
}

export async function MediaRankingPage({
  format,
  searchParams,
}: {
  format: MediaRankingFormat;
  searchParams: SearchParams;
}) {
  const ranking = mediaRanking(format);
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage(ranking.path, resolvedSearchParams);
  const { window, windows, currentSearchParams } = await readRankedListContext(
    resolvedSearchParams,
    ranking.path
  );
  const offset = readRankedOffset(resolvedSearchParams);

  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    async () => {
      try {
        return await getTrendingMedia(
          format,
          "shortTtl",
          rankedListRequest(window, language, offset)
        );
      } catch (error) {
        if (isApiError(error) && error.isNotFound) {
          return { events: [], format, surface: "trending_media" };
        }
        throw error;
      }
    },
    `Failed to load trending ${ranking.label.toLowerCase()}.`,
    {
      window,
      path: ranking.path,
      params: currentSearchParams,
    }
  );

  const events = await hydrateRankedMediaEvents(payload?.events ?? [], format);
  let authorsByPubkey: Record<string, Profile> = {};
  if (events.length > 0) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(extractEventAuthorPubkeys(events), "shortTtl");
    } catch {
      authorsByPubkey = {};
    }
  }

  const continuation = rankedPageContinuation(format, events, offset);
  const continuationHref =
    continuation.nextOffset != null
      ? buildContinuationHref(
          ranking.path,
          currentSearchParams,
          "offset",
          String(continuation.nextOffset)
        )
      : undefined;
  const itemListUrls = events
    .map((event) => eventPageHref(event))
    .filter((href): href is string => Boolean(href));

  return (
    <RankedListPage
      discoverView="media"
      discoverMode={format}
      eyebrow="Media"
      title={ranking.title}
      subtitle={ranking.subtitle}
      path={ranking.path}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      language={language}
      topLanguages={payload?.top_languages}
      semantics={semantics}
      heroExtraBadges={
        offset > 0 ? (
          <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
            offset: {offset.toLocaleString()}
          </span>
        ) : null
      }
      errorMessage={errorMessage}
      emptyTitle={ranking.emptyTitle}
      emptyMessage={ranking.emptyMessage}
      hasItems={events.length > 0}
      loadMore={loadMoreRanking.bind(null, format, window, language ?? "")}
      loadMoreCursor={continuation.token}
      continuationHref={continuationHref}
      continuationLabel={ranking.continuationLabel}
      itemListUrls={itemListUrls}
      debugPayload={payload ?? {}}
    >
      <NotesList
        notes={events}
        authorsByPubkey={authorsByPubkey}
        ranked
        discoverySignals
        showUtilityLinks={false}
        rankOffset={offset}
      />
    </RankedListPage>
  );
}
