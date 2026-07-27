import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { DomainsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { WindowSelector } from "@/components/explorer/window-selector";
import { getTrendingDomains } from "@/lib/api/endpoints";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { formatStatsWindowLabel, readStatsWindow } from "@/lib/search-params/window";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

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
  const resolvedSearchParams = await searchParams;
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const window = readStatsWindow(resolvedSearchParams);
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingDomains>> | null = null;
  try {
    payload = await getTrendingDomains("shortTtl", { cursor, window });
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Failed to load trending domains.");
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
        subtitle="The domains spreading most widely through active notes."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <WindowSelector
              path="/trending/domains"
              searchParams={currentSearchParams}
              activeWindow={window}
            />
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              {formatStatsWindowLabel(window)}
            </span>
            {hasSemantics ? <NativeSemanticsBadges semantics={semantics} /> : null}
          </div>
        }
      />
      <SectionCard title="Domain ranking" description="The domains strongest in view.">
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : payload?.domains && payload.domains.length > 0 ? (
          <DomainsList domains={payload.domains} ranked searchable />
        ) : (
          <EmptyState
            title="No ranked domains yet"
            message="Ranked domains have not populated for this window."
          />
        )}
        {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
          <Link href={continuationHref} className="text-link mt-3 inline-block text-sm">
            Load more domains
          </Link>
        ) : null}
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
