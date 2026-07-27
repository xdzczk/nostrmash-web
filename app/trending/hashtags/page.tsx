import type { Metadata } from "next";

import { HashtagsList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getTrendingHashtags } from "@/lib/api/endpoints";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";

export const metadata: Metadata = {
  title: "Trending Hashtags",
  description: "Explore the topics rising fastest across the network.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingHashtagsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const path = "/trending/hashtags";
  const { cursor, window, currentSearchParams, buildCursorContinuation } = readRankedListContext(
    await searchParams,
    path
  );
  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () => getTrendingHashtags("shortTtl", { cursor, window }),
    "Failed to load trending hashtags."
  );
  const hashtags = payload?.hashtags ?? [];
  const nextCursor = payload?.next_cursor;

  return (
    <RankedListPage
      eyebrow="Ranked hashtags"
      title="Trending hashtags"
      subtitle="The topics rising fastest across the network."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      semantics={semantics}
      sectionTitle="Hashtag ranking"
      sectionDescription="The topics strongest in view."
      errorMessage={errorMessage}
      emptyTitle="No ranked hashtags yet"
      emptyMessage="Ranked hashtags have not populated for this window."
      hasItems={hashtags.length > 0}
      continuationHref={
        typeof nextCursor === "string" && nextCursor.length > 0
          ? buildCursorContinuation(nextCursor)
          : undefined
      }
      continuationLabel="Load more hashtags"
      debugPayload={payload ?? {}}
    >
      <HashtagsList hashtags={hashtags} ranked searchable />
    </RankedListPage>
  );
}
