import type { Metadata } from "next";
import Link from "next/link";

import { ArticlesList } from "@/components/data/renderers";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { WindowSelector } from "@/components/explorer/window-selector";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getTrendingLongForm } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { formatStatsWindowLabel, readStatsWindow } from "@/lib/search-params/window";
import type { Profile } from "@/lib/types/api";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Trending Long-form",
  description: "Explore the long-form articles leading the network.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
  const resolvedSearchParams = await searchParams;
  const window = readStatsWindow(resolvedSearchParams);
  const offset = parseOffset(readSearchParam(resolvedSearchParams, "offset"));
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);

  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingLongForm>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};
  try {
    payload = await getTrendingLongForm("shortTtl", { window, offset, limit: DEFAULT_LIMIT });
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Failed to load trending long-form.");
  }

  const articles = payload?.articles ?? [];
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
    "/trending/long-form",
    currentSearchParams,
    "offset",
    typeof nextOffset === "number" ? String(nextOffset) : undefined
  );

  const semantics = extractNativeApiSemantics(payload);
  const hasSemantics =
    semantics.consistency !== undefined ||
    semantics.trust_mode !== undefined ||
    semantics.trust_applied !== undefined ||
    semantics.result_scope !== undefined;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Ranked long-form"
        title="Trending long-form"
        subtitle="The long-form articles leading the network."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <WindowSelector
              path="/trending/long-form"
              searchParams={currentSearchParams}
              activeWindow={window}
            />
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              {formatStatsWindowLabel(window)}
            </span>
            {offset > 0 ? (
              <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
                offset: {offset.toLocaleString()}
              </span>
            ) : null}
            {hasSemantics ? <NativeSemanticsBadges semantics={semantics} /> : null}
          </div>
        }
      />
      <SectionCard title="Ranked articles" description="The strongest long-form posts in view.">
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : articles.length > 0 ? (
          <ArticlesList
            articles={articles}
            authorsByPubkey={authorsByPubkey}
            ranked
            discoverySignals
          />
        ) : (
          <EmptyState
            title="No ranked articles yet"
            message="Ranked long-form articles have not populated for this window."
          />
        )}
        {typeof nextOffset === "number" ? (
          <Link href={continuationHref} className="text-link mt-3 inline-block text-sm">
            Load more articles
          </Link>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href="/trending/notes"
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            Open trending notes
          </Link>
        </div>
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
