import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { DomainsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getTrendingDomains } from "@/lib/api/endpoints";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { extractNativeApiSemantics } from "@/lib/api/normalize";

export const metadata: Metadata = {
  title: "Trending Domains",
  description: "Domain pulse and ranked note counts from NostrMash discovery data.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingDomainsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingDomains>> | null = null;
  try {
    payload = await getTrendingDomains("shortTtl", { cursor });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load trending domains.";
  }
  const continuationHref = buildContinuationHref(
    "/trending/domains",
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
        eyebrow="Ranked domains"
        title="Trending domains"
        subtitle="Domain activity ordered by current note counts."
        badges={
          hasSemantics ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <NativeSemanticsBadges semantics={semantics} />
            </div>
          ) : undefined
        }
      />
      <SectionCard
        title="Domain ranking"
        description="Top domains are elevated while lower ranks remain dense and scannable."
      >
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : payload?.domains && payload.domains.length > 0 ? (
          <DomainsList domains={payload.domains} ranked searchable />
        ) : (
          <EmptyState
            title="No domain ranking available"
            message="The API did not return ranked domains for the current trend window."
          />
        )}
        {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
          <Link href={continuationHref} className="mt-3 inline-block text-sm text-indigo-300">
            Load more ranked domains
          </Link>
        ) : null}
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
