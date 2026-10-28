import type { Metadata } from "next";

import { HashtagsList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getTrendingHashtags } from "@/lib/api/endpoints";
import { loadMoreRanking } from "@/lib/explorer/load-more-ranking";
import {
  rankedListRequest,
  rankedPageContinuation,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildEntityMetadata, withLanguageVariantMetadata } from "@/lib/seo/metadata";

const TOPICS_SUBTITLE = "The topics on the overview, ranked by how many authors use them.";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return withLanguageVariantMetadata(
    buildEntityMetadata({
      title: "Topics",
      description: TOPICS_SUBTITLE,
      path: "/trending/hashtags",
    }),
    readLanguage(await searchParams),
    "/trending/hashtags"
  );
}

export default async function TrendingHashtagsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const path = "/trending/hashtags";
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage(path, resolvedSearchParams);
  const { window, windows, currentSearchParams } = await readRankedListContext(
    resolvedSearchParams,
    path
  );
  const offset = readRankedOffset(resolvedSearchParams);
  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () => getTrendingHashtags("shortTtl", rankedListRequest(window, language, offset)),
    "Failed to load topics.",
    { window, path, params: currentSearchParams }
  );
  const hashtags = payload?.hashtags ?? [];
  const continuation = rankedPageContinuation("hashtags", hashtags, offset);
  const itemListUrls = hashtags
    .map((entry) => {
      const tag =
        typeof entry === "string" ? entry : typeof entry.hashtag === "string" ? entry.hashtag : "";
      return tag ? `/hashtags/${encodeURIComponent(tag.replace(/^#/, ""))}` : "";
    })
    .filter(Boolean);

  return (
    <RankedListPage
      discoverView="topics"
      eyebrow=""
      title="Topics"
      subtitle={TOPICS_SUBTITLE}
      path={path}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      language={language}
      topLanguages={payload?.top_languages}
      semantics={semantics}
      errorMessage={errorMessage}
      emptyTitle="No ranked hashtags yet"
      emptyMessage="Ranked hashtags have not populated for this window."
      hasItems={hashtags.length > 0}
      loadMore={loadMoreRanking.bind(null, "hashtags", window, language ?? "")}
      loadMoreCursor={continuation.token}
      continuationHref={
        continuation.nextOffset != null
          ? buildContinuationHref(
              path,
              currentSearchParams,
              "offset",
              String(continuation.nextOffset)
            )
          : undefined
      }
      continuationLabel="Load more topics"
      itemListUrls={itemListUrls}
      debugPayload={payload ?? {}}
    >
      <HashtagsList hashtags={hashtags} ranked searchable rankOffset={offset} />
    </RankedListPage>
  );
}
