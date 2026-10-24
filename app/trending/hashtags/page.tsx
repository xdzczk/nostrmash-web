import type { Metadata } from "next";

import { HashtagsList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getDiscoveryHome, HOME_INDEX_LIMIT } from "@/lib/api/endpoints";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import { buildEntityMetadata } from "@/lib/seo/metadata";

const TOPICS_SUBTITLE =
  "The topics on the overview, ranked by how many authors use them. The event count is a separate figure.";

export const metadata: Metadata = buildEntityMetadata({
  title: "Topics",
  description: TOPICS_SUBTITLE,
  path: "/trending/hashtags",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingHashtagsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const path = "/trending/hashtags";
  const { window, currentSearchParams } = readRankedListContext(await searchParams, path);
  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () => getDiscoveryHome("shortTtl", { window, hashtags_limit: HOME_INDEX_LIMIT }),
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
