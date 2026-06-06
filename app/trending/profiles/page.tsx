import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { ProfilesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { WindowSelector } from "@/components/explorer/window-selector";
import { getTrendingProfiles } from "@/lib/api/endpoints";
import { hydrateProfiles } from "@/lib/api/profile-hydration";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { formatStatsWindowLabel, readStatsWindow } from "@/lib/search-params/window";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import type { Profile } from "@/lib/types/api";

export const metadata: Metadata = {
  title: "Trending Profiles",
  description: "Explore the profiles with the strongest momentum.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingProfilesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const window = readStatsWindow(resolvedSearchParams);
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingProfiles>> | null = null;
  let hydratedProfiles: Profile[] = [];
  try {
    payload = await getTrendingProfiles("shortTtl", { cursor, window });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load trending profiles.";
  }
  const continuationHref = buildContinuationHref(
    "/trending/profiles",
    currentSearchParams,
    "cursor",
    payload?.next_cursor
  );

  if (payload?.profiles?.length) {
    const sourceProfiles = payload.profiles;
    try {
      hydratedProfiles = await hydrateProfiles(sourceProfiles, "shortTtl");
    } catch {
      hydratedProfiles = sourceProfiles;
    }
  }
  const semantics = extractNativeApiSemantics(payload);
  const hasSemantics =
    semantics.consistency !== undefined ||
    semantics.trust_mode !== undefined ||
    semantics.trust_applied !== undefined ||
    semantics.result_scope !== undefined;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Ranked profiles"
        title="Trending profiles"
        subtitle="The profiles with the strongest momentum."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <WindowSelector
              path="/trending/profiles"
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
      <SectionCard title="Ranked profiles" description="The profiles strongest in view.">
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : hydratedProfiles.length > 0 ? (
          <ProfilesList profiles={hydratedProfiles} ranked discoverySignals />
        ) : (
          <EmptyState
            title="No ranked profiles yet"
            message="Ranked profiles have not populated for this window."
          />
        )}
        {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
          <Link href={continuationHref} className="text-link mt-3 inline-block text-sm">
            Load more profiles
          </Link>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href="/discovery/profiles/rising"
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            Open rising profiles
          </Link>
        </div>
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
