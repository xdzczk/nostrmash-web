import type { Metadata } from "next";
import Link from "next/link";

import { ArticlesList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getTrendingLongForm } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { loadMoreRanking } from "@/lib/explorer/load-more-ranking";
import {
  rankedListRequest,
  rankedPageContinuation,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import { buildLanguageHref, readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { withLanguageVariantMetadata } from "@/lib/seo/metadata";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return withLanguageVariantMetadata(
    {
      title: "Long-form",
      description: "Explore the long-form articles leading the network.",
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
  const { window, currentSearchParams } = readRankedListContext(resolvedSearchParams, path);
  const offset = readRankedOffset(resolvedSearchParams);

  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () => getTrendingLongForm("shortTtl", rankedListRequest(window, language, offset)),
    "Failed to load trending long-form."
  );

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
  const continuationHref =
    continuation.nextOffset != null
      ? buildContinuationHref(path, currentSearchParams, "offset", String(continuation.nextOffset))
      : undefined;

  return (
    <RankedListPage
      discoverView="notes"
      discoverMode="long-form"
      eyebrow="Notes"
      title="Long-form"
      subtitle="The long-form articles leading the network."
      path={path}
      searchParams={currentSearchParams}
      window={window}
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
      emptyTitle="No ranked articles yet"
      emptyMessage="Ranked long-form articles have not populated for this window."
      hasItems={articles.length > 0}
      loadMore={loadMoreRanking.bind(null, "long-form", window, language ?? "")}
      loadMoreCursor={continuation.token}
      continuationHref={continuationHref}
      continuationLabel="Load more articles"
      footer={
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href={buildLanguageHref("/trending/notes", new URLSearchParams(), language)}
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            Open trending notes
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
    </RankedListPage>
  );
}
