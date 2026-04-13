import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getTrendingHashtags } from "@/lib/api/endpoints";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { extractNativeApiSemantics } from "@/lib/api/normalize";

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
  const resolvedSearchParams = await searchParams;
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingHashtags>> | null = null;
  try {
    payload = await getTrendingHashtags("shortTtl", { cursor });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load trending hashtags.";
  }
  const continuationHref = buildContinuationHref(
    "/trending/hashtags",
    currentSearchParams,
    "cursor",
    payload?.next_cursor
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
        eyebrow="Ranked hashtags"
        title="Trending hashtags"
        subtitle="The topics rising fastest across the network."
        badges={
          hasSemantics ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <NativeSemanticsBadges semantics={semantics} />
            </div>
          ) : undefined
        }
      />
      <SectionCard title="Hashtag ranking" description="The topics strongest in view.">
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : payload?.hashtags && payload.hashtags.length > 0 ? (
          <HashtagsList hashtags={payload.hashtags} ranked searchable />
        ) : (
          <EmptyState
            title="No ranked hashtags yet"
            message="Ranked hashtags have not populated for this window."
          />
        )}
        {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
          <Link href={continuationHref} className="mt-3 inline-block text-sm text-indigo-300">
            Load more hashtags
          </Link>
        ) : null}
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
