import type { Metadata } from "next";
import Link from "next/link";

import { ArticlesList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getTrendingLongForm } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import { buildLanguageHref, readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildContinuationHref, readSearchParam } from "@/lib/search-params/pagination";
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

const DEFAULT_LIMIT = 20;

function parseOffset(value: string | undefined): number {
  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 5000);
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
  const offset = parseOffset(readSearchParam(resolvedSearchParams, "offset"));

  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () =>
      getTrendingLongForm("shortTtl", {
        window,
        offset,
        limit: DEFAULT_LIMIT,
        ...(language ? { lang: language } : {}),
      }),
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

  const hasMore = articles.length >= DEFAULT_LIMIT;
  const nextOffset = hasMore ? offset + articles.length : undefined;
  const continuationHref = buildContinuationHref(
    path,
    currentSearchParams,
    "offset",
    typeof nextOffset === "number" ? String(nextOffset) : undefined
  );

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
      continuationHref={typeof nextOffset === "number" ? continuationHref : undefined}
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
      />
    </RankedListPage>
  );
}
