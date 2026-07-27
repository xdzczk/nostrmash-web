import type { Metadata } from "next";

import { DomainsList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getTrendingDomains } from "@/lib/api/endpoints";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";

export const metadata: Metadata = {
  title: "Trending Domains",
  description: "Explore the domains spreading most widely through active notes.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingDomainsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const path = "/trending/domains";
  const { cursor, window, currentSearchParams, buildCursorContinuation } = readRankedListContext(
    await searchParams,
    path
  );
  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () => getTrendingDomains("shortTtl", { cursor, window }),
    "Failed to load trending domains."
  );
  const domains = payload?.domains ?? [];
  const nextCursor = payload?.next_cursor;

  return (
    <RankedListPage
      eyebrow="Ranked domains"
      title="Trending domains"
      subtitle="The domains spreading most widely through active notes."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      semantics={semantics}
      sectionTitle="Domain ranking"
      sectionDescription="The domains strongest in view."
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
      debugPayload={payload ?? {}}
    >
      <DomainsList domains={domains} ranked searchable />
    </RankedListPage>
  );
}
