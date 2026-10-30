import type { Metadata } from "next";
import Link from "next/link";

import { ArticlesList } from "@/components/data/renderers";
import {
  RankedListResults,
  RankedListStatus,
  RankedListStream,
} from "@/components/explorer/ranked-list-page";
import { NotesListSkeleton } from "@/components/ui/skeleton";
import { getTrendingLongForm } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
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
import { buildLanguageHref, readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { withLanguageVariantMetadata } from "@/lib/seo/metadata";
import type { StatsWindow } from "@/lib/search-params/window";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return withLanguageVariantMetadata(
    {
      title: "Articles",
      description: "Explore the articles leading the network.",
    },
    readLanguage(await searchParams),
    "/trending/long-form"
  );
}

export default async function TrendingLongFormPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const path = "/trending/long-form";
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage(path, resolvedSearchParams);
  const { window, windows, currentSearchParams } = await readRankedListContext(
    resolvedSearchParams,
    path
  );
  const offset = readRankedOffset(resolvedSearchParams);
  const data = startRankedLoad(
    loadRankedListPayload(
      () => getTrendingLongForm("shortTtl", rankedListRequest(window, language, offset)),
      "Failed to load articles.",
      { window, path, params: currentSearchParams }
    )
  );

  return (
    <RankedListStream
      data={data}
      discoverView="articles"
      eyebrow=""
      title="Articles"
      subtitle="The articles leading the network."
      path={path}
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
      <TrendingArticlesBody
        data={data}
        path={path}
        searchParams={currentSearchParams}
        window={window}
        language={language}
        offset={offset}
      />
    </RankedListStream>
  );
}

async function TrendingArticlesBody({
  data,
  path,
  searchParams,
  window,
  language,
  offset,
}: {
  data: ReturnType<typeof loadRankedListPayload<Awaited<ReturnType<typeof getTrendingLongForm>>>>;
  path: string;
  searchParams: URLSearchParams;
  window: StatsWindow;
  language?: string;
  offset: number;
}) {
  const { payload, errorMessage, semantics } = await data;
  const articles = payload?.articles ?? [];
  let authorsByPubkey: Record<string, Profile> = {};
  if (articles.length > 0) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(
        extractEventAuthorPubkeys(articles),
        "shortTtl"
      );
    } catch {
      authorsByPubkey = {};
    }
  }

  const continuation = rankedPageContinuation("long-form", articles, offset);

  return (
    <>
      <RankedListStatus
        errorMessage={errorMessage}
        hasItems={articles.length > 0}
        path={path}
        searchParams={searchParams}
      />
      <RankedListResults
        title="Articles"
        language={language}
        semantics={semantics}
        errorMessage={errorMessage}
        emptyTitle="No ranked articles yet"
        emptyMessage="Ranked articles have not populated for this window."
        hasItems={articles.length > 0}
        loadMore={loadMoreRanking.bind(null, "long-form", window, language ?? "")}
        loadMoreCursor={continuation.token}
        continuationHref={
          continuation.nextOffset != null
            ? buildContinuationHref(path, searchParams, "offset", String(continuation.nextOffset))
            : undefined
        }
        continuationLabel="Load more articles"
        footer={
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link
              href={buildLanguageHref("/trending/notes", new URLSearchParams(), language)}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
            >
              Open notes
            </Link>
          </div>
        }
        debugPayload={payload ?? {}}
      >
        <ArticlesList
          articles={articles}
          authorsByPubkey={authorsByPubkey}
          ranked
          showUtilityLinks={false}
          rankOffset={offset}
        />
      </RankedListResults>
    </>
  );
}
