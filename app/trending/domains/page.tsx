import type { Metadata } from "next";

import { DomainsList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getTrendingDomains } from "@/lib/api/endpoints";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import { readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildEntityMetadata, withLanguageVariantMetadata } from "@/lib/seo/metadata";

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
  const { cursor, window, currentSearchParams, buildCursorContinuation } = readRankedListContext(
    resolvedSearchParams,
    path
  );
  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () =>
      getTrendingDomains("shortTtl", { cursor, window, ...(language ? { lang: language } : {}) }),
    "Failed to load trending domains."
  );
  const domains = payload?.domains ?? [];
  const nextCursor = payload?.next_cursor;
  const itemListUrls = domains
    .map((entry) => {
      const domain =
        typeof entry === "string" ? entry : typeof entry.domain === "string" ? entry.domain : "";
      return domain ? `/domains/${encodeURIComponent(domain)}` : "";
    })
    .filter(Boolean);

  return (
    <RankedListPage
      discoverView="links"
      eyebrow=""
      title="Links"
      subtitle="The domains spreading most widely through active notes."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      language={language}
      topLanguages={payload?.top_languages}
      semantics={semantics}
      errorMessage={errorMessage}
      emptyTitle="No ranked domains yet"
      emptyMessage="Ranked domains have not populated for this window."
      hasItems={domains.length > 0}
      continuationHref={
        typeof nextCursor === "string" && nextCursor.length > 0
          ? buildCursorContinuation(nextCursor)
          : undefined
      }
      continuationLabel="Load more domains"
      itemListUrls={itemListUrls}
      debugPayload={payload ?? {}}
    >
      <DomainsList domains={domains} ranked searchable />
    </RankedListPage>
  );
}
