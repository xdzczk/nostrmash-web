import type { Metadata } from "next";

import { HashtagsList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getDiscoveryHome, HOME_INDEX_LIMIT } from "@/lib/api/endpoints";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
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
  const { window, currentSearchParams } = readRankedListContext(resolvedSearchParams, path);
  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () =>
      getDiscoveryHome("shortTtl", {
        window,
        hashtags_limit: HOME_INDEX_LIMIT,
        ...(language ? { lang: language } : {}),
      }),
    "Failed to load topics."
  );
  const hashtags = payload?.hashtags ?? [];
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
      language={language}
      topLanguages={payload?.top_languages}
      semantics={semantics}
      errorMessage={errorMessage}
      emptyTitle="No ranked hashtags yet"
      emptyMessage="Ranked hashtags have not populated for this window."
      hasItems={hashtags.length > 0}
      itemListUrls={itemListUrls}
      debugPayload={payload ?? {}}
    >
      <HashtagsList hashtags={hashtags} ranked searchable />
    </RankedListPage>
  );
}
