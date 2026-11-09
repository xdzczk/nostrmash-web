import type { Metadata } from "next";

import { NotesList } from "@/components/data/renderers";
import {
  RankedListResults,
  RankedListStatus,
  RankedListStream,
} from "@/components/explorer/ranked-list-page";
import { NotesListSkeleton } from "@/components/ui/skeleton";
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
import {
  loadRankedListPayload,
  readRankedListContext,
  startRankedLoad,
} from "@/lib/explorer/ranked-list";
import { eventPageHref } from "@/lib/notes/kinds";
import { readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { withLanguageVariantMetadata } from "@/lib/seo/metadata";
import type { StatsWindow } from "@/lib/search-params/window";
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
  const data = startRankedLoad(
    loadRankedListPayload(
      async () => {
        try {
          return await getTrendingMedia(
            format,
            "shortTtl",
            rankedListRequest(window, language, offset)
          );
        } catch (error) {
          if (isApiError(error) && error.isNotFound) {
            return { events: [], format, surface: "trending_media" as const };
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
    )
  );

  return (
    <RankedListStream
      data={data}
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
      heroExtraBadges={
        offset > 0 ? (
          <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
            offset: {offset.toLocaleString()}
          </span>
        ) : null
      }
      fallback={<NotesListSkeleton />}
    >
      <MediaRankingBody
        data={data}
        format={format}
        path={ranking.path}
        searchParams={currentSearchParams}
        window={window}
        language={language}
        offset={offset}
        title={ranking.title}
        emptyTitle={ranking.emptyTitle}
        emptyMessage={ranking.emptyMessage}
        continuationLabel={ranking.continuationLabel}
      />
    </RankedListStream>
  );
}

async function MediaRankingBody({
  data,
  format,
  path,
  searchParams,
  window,
  language,
  offset,
  title,
  emptyTitle,
  emptyMessage,
  continuationLabel,
}: {
  data: ReturnType<typeof loadRankedListPayload<Awaited<ReturnType<typeof getTrendingMedia>>>>;
  format: MediaRankingFormat;
  path: string;
  searchParams: URLSearchParams;
  window: StatsWindow;
  language?: string;
  offset: number;
  title: string;
  emptyTitle: string;
  emptyMessage: string;
  continuationLabel: string;
}) {
  const { payload, errorMessage, semantics } = await data;
  const rankedEvents = payload?.events ?? [];
  const authorsPromise =
    rankedEvents.length > 0
      ? fetchProfilesByPubkey(extractEventAuthorPubkeys(rankedEvents), "shortTtl").catch(
          () => ({}) as Record<string, Profile>
        )
      : Promise.resolve({} as Record<string, Profile>);
  const events = await hydrateRankedMediaEvents(rankedEvents, format);
  const authorsByPubkey = await authorsPromise;
  const continuation = rankedPageContinuation(format, events, offset);
  const itemListUrls = events
    .map((event) => eventPageHref(event))
    .filter((href): href is string => Boolean(href));

  return (
    <>
      <RankedListStatus
        errorMessage={errorMessage}
        hasItems={events.length > 0}
        path={path}
        searchParams={searchParams}
      />
      <RankedListResults
        title={title}
        language={language}
        semantics={semantics}
        errorMessage={errorMessage}
        emptyTitle={emptyTitle}
        emptyMessage={emptyMessage}
        hasItems={events.length > 0}
        loadMore={loadMoreRanking.bind(null, format, window, language ?? "")}
        loadMoreCursor={continuation.token}
        continuationHref={
          continuation.nextOffset != null
            ? buildContinuationHref(path, searchParams, "offset", String(continuation.nextOffset))
            : undefined
        }
        continuationLabel={continuationLabel}
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
      </RankedListResults>
    </>
  );
}
