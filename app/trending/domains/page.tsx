import type { Metadata } from "next";

import { DomainsList } from "@/components/data/renderers";
import {
  RankedListResults,
  RankedListStatus,
  RankedListStream,
} from "@/components/explorer/ranked-list-page";
import { ChipGridSkeleton } from "@/components/ui/skeleton";
import { getTrendingDomains } from "@/lib/api/endpoints";
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
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildEntityMetadata, withLanguageVariantMetadata } from "@/lib/seo/metadata";
import type { StatsWindow } from "@/lib/search-params/window";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return withLanguageVariantMetadata(
    buildEntityMetadata({
      title: "Links",
      description: "Explore the domains spreading most widely through active notes.",
      path: "/trending/domains",
    }),
    readLanguage(await searchParams),
    "/trending/domains"
  );
}

export default async function TrendingDomainsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const path = "/trending/domains";
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage(path, resolvedSearchParams);
  const { window, windows, currentSearchParams } = await readRankedListContext(
    resolvedSearchParams,
    path
  );
  const offset = readRankedOffset(resolvedSearchParams);
  const data = startRankedLoad(
    loadRankedListPayload(
      () => getTrendingDomains("shortTtl", rankedListRequest(window, language, offset)),
      "Failed to load trending domains.",
      { window, path, params: currentSearchParams }
    )
  );

  return (
    <RankedListStream
      data={data}
      discoverView="links"
      eyebrow=""
      title="Links"
      subtitle="The domains spreading most widely through active notes."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      language={language}
      fallback={<ChipGridSkeleton />}
    >
      <TrendingDomainsBody
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

async function TrendingDomainsBody({
  data,
  path,
  searchParams,
  window,
  language,
  offset,
}: {
  data: ReturnType<typeof loadRankedListPayload<Awaited<ReturnType<typeof getTrendingDomains>>>>;
  path: string;
  searchParams: URLSearchParams;
  window: StatsWindow;
  language?: string;
  offset: number;
}) {
  const { payload, errorMessage, semantics } = await data;
  const domains = payload?.domains ?? [];
  const continuation = rankedPageContinuation("domains", domains, offset);
  const itemListUrls = domains
    .map((entry) => {
      const domain =
        typeof entry === "string" ? entry : typeof entry.domain === "string" ? entry.domain : "";
      return domain ? `/domains/${encodeURIComponent(domain)}` : "";
    })
    .filter(Boolean);

  return (
    <>
      <RankedListStatus
        errorMessage={errorMessage}
        hasItems={domains.length > 0}
        path={path}
        searchParams={searchParams}
      />
      <RankedListResults
        title="Links"
        language={language}
        semantics={semantics}
        errorMessage={errorMessage}
        emptyTitle="No ranked domains yet"
        emptyMessage="Ranked domains have not populated for this window."
        hasItems={domains.length > 0}
        loadMore={loadMoreRanking.bind(null, "domains", window, language ?? "")}
        loadMoreCursor={continuation.token}
        continuationHref={
          continuation.nextOffset != null
            ? buildContinuationHref(path, searchParams, "offset", String(continuation.nextOffset))
            : undefined
        }
        continuationLabel="Load more domains"
        itemListUrls={itemListUrls}
        debugPayload={payload ?? {}}
      >
        <DomainsList domains={domains} ranked searchable rankOffset={offset} />
      </RankedListResults>
    </>
  );
}
